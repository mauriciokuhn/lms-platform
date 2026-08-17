import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import {
  authLimiter,
  accountLoginLimiter,
  checkLoginLockout,
  recordLoginFailure,
  resetLoginFailures,
  getLoginFailureCount,
  FAILURE_THRESHOLD,
} from "@/lib/rate-limit";
import {
  verifyLoginChallenge,
  CHALLENGE_THRESHOLD,
} from "@/lib/login-challenge";
import { sendAccountLockedEmail, sendNewLoginEmail, sendTwoFactorEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { issueTwoFactorCode } from "@/lib/two-factor";
import { getClientIp } from "@/lib/rate-limit";
import { recordLoginIp, hashIp } from "@/lib/login-audit";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  extractSessionTokenFromSetCookie,
  hashSessionToken,
  decodeSessionToken,
} from "@/lib/session-token";

const { GET: nextAuthGET, POST: nextAuthPOST } = handlers;

/** Builds the 429 the Auth.js client understands (see note below). */
function rateLimited(result: { error?: string; headers: Record<string, string> }, request: NextRequest) {
  // The Auth.js client parses data.url and throws on malformed responses
  // (a body without `url` makes `new URL(undefined)` reject), which would
  // leave the login button stuck on "Entrando...". Carry a valid redirect
  // URL so the client returns { status: 429 } and the page can surface
  // the friendly message instead.
  return NextResponse.json(
    {
      error: result.error,
      url: new URL("/login?error=RateLimit", request.url).toString(),
    },
    { status: 429, headers: result.headers }
  );
}

/**
 * Rate-limited POST handler.
 *
 * Protege o login por credenciais contra força bruta em três camadas:
 *  - checkLoginLockout: 10 falhas CONSECUTIVAS → bloqueio de 15 min na conta
 *    (zera ao login bem-sucedido) — a defesa mais dura contra força bruta;
 *  - accountLoginLimiter: 5 tentativas/min por E-MAIL — bloqueia ataque a uma
 *    conta específica mesmo com IPs rotativos;
 *  - authLimiter: 60 req/min por IP — guarda de pulverização entre contas,
 *    alta o bastante para não bloquear turmas inteiras atrás de um NAT escolar.
 * Fluxos OAuth (Google) passam por /callback/google e não são afetados.
 */
export async function POST(request: NextRequest) {
  // Read the account from the form body (the clone keeps the body intact
  // for the NextAuth handler below). Falls back to IP-only limiting when
  // the body is unreadable.
  let email = "";
  let password = "";
  let challengeToken = "";
  let challengeAnswer = "";

  if (request.nextUrl.pathname.endsWith("/callback/credentials")) {
    try {
      const clone = request.clone();
      const form = await clone.formData();
      email = String(form.get("email") ?? "").trim().toLowerCase();
      password = String(form.get("password") ?? "");
      challengeToken = String(form.get("challengeToken") ?? "");
      challengeAnswer = String(form.get("challengeAnswer") ?? "");
    } catch {
      // malformed body — IP guard still applies
    }

    if (email) {
      // Anti-bot challenge: after a few consecutive failures the client must
      // answer a one-time math question (issued by GET /api/auth/challenge).
      const failures = await getLoginFailureCount(email);
      if (failures >= CHALLENGE_THRESHOLD) {
        const ok = await verifyLoginChallenge(challengeToken, challengeAnswer, email);
        if (!ok) {
          return NextResponse.json(
            {
              error: "Verificação de segurança necessária. Responda o desafio para continuar.",
              url: new URL("/login?error=ChallengeFailed", request.url).toString(),
            },
            { status: 400, headers: { "X-Challenge-Required": "1" } }
          );
        }
      }

      // Hard lockout first: 10 consecutive failures → 15 min block.
      const lockout = await checkLoginLockout(email);
      if (lockout.locked) {
        const retrySeconds = Math.max(1, Math.ceil(lockout.remainingMs / 1000));
        return NextResponse.json(
          {
            error: `Muitas tentativas de login. Conta bloqueada por ${Math.ceil(lockout.remainingMs / 60000)} minuto(s).`,
            url: new URL("/login?error=RateLimit", request.url).toString(),
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retrySeconds),
              "X-RateLimit-Limit": String(FAILURE_THRESHOLD),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(retrySeconds),
            },
          }
        );
      }

      const account = await accountLoginLimiter.checkKey(email);
      if (!account.allowed) return rateLimited(account, request);
    }

    const result = await authLimiter.check(request);
    if (!result.allowed) return rateLimited(result, request);

    // 2FA: accounts with twoFactorEnabled get an emailed code — the session
    // is only created after POST /api/auth/2fa/verify confirms it. A wrong
    // password falls through to NextAuth (normal invalid credentials).
    if (email) {
      const user2fa = await db.user.findUnique({
        where: { email },
        select: { twoFactorEnabled: true, passwordHash: true },
      });
      if (user2fa?.twoFactorEnabled) {
        const validPassword = user2fa.passwordHash
          ? await bcrypt.compare(password, user2fa.passwordHash)
          : false;
        if (validPassword) {
          try {
            const code = await issueTwoFactorCode(email);
            await sendTwoFactorEmail(email, code);
          } catch (err) {
            logger.warn("2FA code email failed", {
              error: err instanceof Error ? err.message : String(err),
            });
          }
          return NextResponse.json(
            {
              error: "Código de verificação enviado para seu e-mail.",
              url: new URL("/login?error=TwoFactorRequired", request.url).toString(),
            },
            { status: 202 }
          );
        }
      }
    }
  }

  const res = await nextAuthPOST(request);

  // Track consecutive failures per account (only when we could read the
  // email). Two failure signals, depending on the caller:
  //  - curl/API clients get the classic 302 → /login?error=...;
  //  - the Auth.js browser client sends X-Auth-Return-Redirect, so NextAuth
  //    answers 200 with JSON { url: "/login?error=..." } instead of a 302.
  // Without the second check every browser login would look like a success
  // and the lockout/challenge would never arm.
  if (email) {
    let failed = false;
    const location = res.headers.get("location") ?? "";
    if (location.includes("error=")) {
      failed = true;
    } else if (res.status === 200) {
      try {
        const body = (await res.clone().json()) as { url?: unknown };
        if (typeof body?.url === "string" && body.url.includes("error=")) {
          failed = true;
        }
      } catch {
        // Not JSON — treat as success.
      }
    }

    if (failed) {
      const lockout = await recordLoginFailure(email);
      // The 10th consecutive failure just armed the lockout — warn the real
      // owner by email (fire-and-forget; never block the login response on
      // an email round-trip).
      if (lockout.locked) {
        void sendAccountLockedEmail(
          email,
          Math.max(1, Math.ceil(lockout.remainingMs / 60000))
        ).catch(() => {});
      }
    } else {
      await resetLoginFailures(email);
      // New-network alert: record this successful login's IP (hashed) and
      // warn the owner when it differs from the last one on record.
      const { isNewIp } = await recordLoginIp(email, getClientIp(request));
      if (isNewIp) {
        void sendNewLoginEmail(
          email,
          new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "long",
            timeStyle: "short",
          }).format(new Date())
        ).catch(() => {});
      }
      // Persistent session history (shown on the profile page). Best-effort:
      // the login response must never depend on this write succeeding.
      try {
        const user = await db.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (user) {
          // Link the record to the session token (hashed) so the profile can
          // revoke this specific login remotely.
          const sessionToken = extractSessionTokenFromSetCookie(res.headers.get("set-cookie"));
          await db.loginHistory.create({
            data: {
              userId: user.id,
              ipHash: hashIp(getClientIp(request)),
              userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
              ...(sessionToken
                ? { sessionTokenHash: await hashSessionToken(sessionToken) }
                : {}),
            },
          });
        }
      } catch (err) {
        logger.warn("Could not record login history", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return res;
}

/**
 * GET handler wrapper — records OAuth sign-ins in the session history.
 *
 * The credentials flow is handled in POST; OAuth providers (Google) sign in
 * through /api/auth/callback/<provider> as GET. On success NextAuth answers
 * with a Set-Cookie for the session JWT, which we decrypt to attribute the
 * login and persist it (best-effort — never blocks the auth response).
 */
export async function GET(request: NextRequest) {
  const res = await nextAuthGET(request);

  const path = request.nextUrl.pathname;
  const isOAuthCallback =
    path.startsWith("/api/auth/callback/") && !path.endsWith("/credentials");

  if (isOAuthCallback) {
    try {
      const sessionToken = extractSessionTokenFromSetCookie(res.headers.get("set-cookie"));
      if (sessionToken) {
        const payload = await decodeSessionToken(sessionToken);
        if (payload?.sub) {
          const user = await db.user.findUnique({
            where: { id: payload.sub },
            select: { id: true },
          });
          if (user) {
            await db.loginHistory.create({
              data: {
                userId: user.id,
                ipHash: hashIp(getClientIp(request)),
                userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
                sessionTokenHash: await hashSessionToken(sessionToken),
              },
            });
          }
        }
      }
    } catch (err) {
      logger.warn("Could not record OAuth login history", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return res;
}
