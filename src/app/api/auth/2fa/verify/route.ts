import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountLoginLimiter } from "@/lib/rate-limit";
import { verifyTwoFactorCode } from "@/lib/two-factor";
import { isRecoveryCodeFormat, hashRecoveryCode } from "@/lib/recovery-codes";
import { resetLoginFailures } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/rate-limit";
import { recordLoginIp } from "@/lib/login-audit";
import { hashIp } from "@/lib/login-audit";
import { hashSessionToken, encodeSessionToken, SESSION_COOKIE_NAME } from "@/lib/session-token";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/2fa/verify
 *
 * Second step of a 2FA login: validates the emailed code (one-time, 5 min)
 * and, on success, creates the Auth.js session directly (same JWE scheme)
 * by setting the session cookie. Also records the login history/audit just
 * like the credentials wrapper does.
 */
export async function POST(request: Request) {
  try {
    let email = "";
    let code = "";
    try {
      const body = (await request.json()) as { email?: unknown; code?: unknown };
      email = String(body?.email ?? "").trim().toLowerCase();
      code = String(body?.code ?? "").trim();
    } catch {
      // malformed body
    }

    if (!email || !code) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // Brute-force guard on the 6-digit code.
    const limiter = await accountLoginLimiter.checkKey(email);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
    }

    // Two accepted inputs: the emailed 6-digit code, or a one-time recovery
    // code (fallback when the user lost access to the e-mail).
    const valid = await verifyTwoFactorCode(email, code);
    if (!valid) {
      const recovery = await consumeRecoveryCode(email, code);
      if (!recovery) {
        return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
      }
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true, plan: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const token = await encodeSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      isDemo: user.email === "demo@lms.com",
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    // Same post-login bookkeeping as the credentials wrapper (best-effort).
    await resetLoginFailures(email);
    const ip = getClientIp(request);
    await recordLoginIp(email, ip);
    const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;
    const sessionTokenHash = await hashSessionToken(token);
    try {
      await db.loginHistory.create({
        data: { userId: user.id, ipHash: hashIp(ip), userAgent, sessionTokenHash },
      });
    } catch (err) {
      logger.warn("Could not record 2FA login history", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return res;
  } catch (error) {
    logger.error("POST /api/auth/2fa/verify error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao verificar código" }, { status: 500 });
  }
}

/**
 * Consumes a one-time recovery code for the account (best-effort). Only
 * accepts the XXXX-XXXX format and requires 2FA enabled; the code hash is
 * matched against unused codes and marked used on success.
 */
async function consumeRecoveryCode(email: string, code: string): Promise<boolean> {
  if (!isRecoveryCodeFormat(code)) return false;
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, twoFactorEnabled: true },
    });
    if (!user?.twoFactorEnabled) return false;

    const codeHash = await hashRecoveryCode(code.replace("-", ""));
    const match = await db.twoFactorRecoveryCode.findFirst({
      where: { userId: user.id, codeHash, usedAt: null },
      select: { id: true },
    });
    if (!match) return false;

    await db.twoFactorRecoveryCode.update({
      where: { id: match.id },
      data: { usedAt: new Date() },
    });
    return true;
  } catch (err) {
    logger.warn("Recovery code lookup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
