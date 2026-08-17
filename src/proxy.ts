import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, hashSessionToken } from "@/lib/session-token";
import { db } from "@/lib/db";

// `.auth` is overloaded (API-route sessions vs. middleware); cast to the
// middleware signature used here.
const authProxy = NextAuth(authConfig).auth as unknown as (
  req: NextRequest
) => Promise<Response | NextResponse | undefined>;

/**
 * Proxy (Next 16's middleware): protects the app routes through Auth.js and
 * additionally rejects sessions that were revoked remotely (the profile's
 * "Encerrar" button).
 *
 * With the JWT strategy a token can't be invalidated server-side, so the
 * revoke endpoint marks the LoginHistory row `revokedAt`; here we hash the
 * request's cookie and bounce to /login?error=SessionRevoked when that hash
 * was revoked. The DB is the source of truth — no shared memory or Redis
 * needed between the proxy and the app server.
 */
export default async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const hash = await hashSessionToken(token);
    const revoked = await db.loginHistory.findFirst({
      where: { sessionTokenHash: hash, revokedAt: { not: null } },
      select: { id: true },
    });
    if (revoked) {
      const url = new URL("/login?error=SessionRevoked", request.url);
      const res = NextResponse.redirect(url);
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }
  }
  return authProxy(request);
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: [
    // Protected routes
    "/admin/:path*",
    "/dashboard/:path*",
    "/instrutor/:path*",
    "/perfil/:path*",
    "/configuracoes/:path*",
    "/meus-cursos/:path*",
    "/certificados/:path*",
    // Redirect logged-in users away from login
    "/login",
    "/register",
  ],
};
