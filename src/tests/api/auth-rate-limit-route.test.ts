/**
 * Route-level tests for the rate-limited NextAuth wrapper
 * (src/app/api/auth/[...nextauth]/route.ts).
 *
 * The wrapper applies two limiters ONLY to the /callback/credentials path —
 * brute-force protection for password login:
 *   - accountLoginLimiter: 5 attempts/min per e-mail (blocks single-account
 *     attacks even with rotating IPs);
 *   - authLimiter: 60 attempts/min per IP (spray guard, classroom-NAT safe).
 * OAuth callbacks (/callback/google) must never be limited.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { EncryptJWT } from "jose";
import { hkdf } from "@panva/hkdf";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
const handlersMock = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ handlers: handlersMock }));

// Mock the email lib so the new-IP alert can be asserted without sending
// anything, and the DB so the best-effort login-history write stays a no-op.
const emailMock = vi.hoisted(() => ({
  sendAccountLockedEmail: vi.fn(),
  sendNewLoginEmail: vi.fn(),
}));
vi.mock("@/lib/email", () => emailMock);

const dbMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  loginHistory: { create: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db: dbMock }));

// The anti-bot challenge (math question after 3 consecutive failures) is a
// separate module with its own tests. Here we simulate an attacker that
// always solves it, so these tests exercise the rate-limit/lockout layers
// the challenge sits in front of.
vi.mock("@/lib/login-challenge", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/login-challenge")>();
  return { ...mod, verifyLoginChallenge: vi.fn(() => true) };
});

import { GET, POST } from "@/app/api/auth/[...nextauth]/route";
import {
  authLimiter,
  accountLoginLimiter,
  clearLoginFailures,
} from "@/lib/rate-limit";
import { clearLoginAudit } from "@/lib/login-audit";

function postTo(path: string, ip = "203.0.113.10", email?: string) {
  const request = new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    ...(email ? { body: new URLSearchParams({ email }) } : {}),
  });
  return POST(request);
}

describe("Rate-limited NextAuth POST wrapper", () => {
  beforeEach(() => {
    // Reset the shared in-memory limiters/lockout store between tests.
    authLimiter.clear();
    accountLoginLimiter.clear();
    clearLoginFailures();
    clearLoginAudit();
    emailMock.sendNewLoginEmail.mockReset();
    emailMock.sendNewLoginEmail.mockResolvedValue({});
    emailMock.sendAccountLockedEmail.mockReset();
    emailMock.sendAccountLockedEmail.mockResolvedValue({});
    dbMock.user.findUnique.mockReset();
    dbMock.user.findUnique.mockResolvedValue({ id: "user-1" });
    dbMock.loginHistory.create.mockReset();
    dbMock.loginHistory.create.mockResolvedValue({});
    handlersMock.POST.mockReset();
    handlersMock.POST.mockResolvedValue(new Response("ok", { status: 200 }));
  });

  it("passes credentials requests through to NextAuth while under the limit", async () => {
    for (let i = 0; i < 60; i++) {
      const res = await postTo("/api/auth/callback/credentials");
      expect(res.status).toBe(200);
    }
    expect(handlersMock.POST).toHaveBeenCalledTimes(60);
  });

  it("returns 429 after exceeding the per-IP limit on the credentials callback", async () => {
    // Consume all 60 allowed requests.
    for (let i = 0; i < 60; i++) {
      await postTo("/api/auth/callback/credentials");
    }

    const res = await postTo("/api/auth/callback/credentials");
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Muitas requisições");
    // NextAuth must NOT be invoked for the rejected request.
    expect(handlersMock.POST).toHaveBeenCalledTimes(60);
  });

  it("blocks a single account after 5 attempts, even from different IPs", async () => {
    const email = "alvo@exemplo.com";
    for (let i = 0; i < 5; i++) {
      const res = await postTo("/api/auth/callback/credentials", "203.0.113.1", email);
      expect(res.status).toBe(200);
    }

    // Same account, different IP → the per-account limiter still blocks.
    const blocked = await postTo("/api/auth/callback/credentials", "203.0.113.99", email);
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toContain("Muitas requisições");
    expect(handlersMock.POST).toHaveBeenCalledTimes(5);
  });

  /** NextAuth-style failed-credentials redirect. */
  function failingLogin(): Response {
    return new Response(null, {
      status: 302,
      headers: { location: "http://localhost/login?error=CredentialsSignin&code=credentials" },
    });
  }

  it("locks an account for 15 min after 10 consecutive failures", async () => {
    const email = "alvo-lock@exemplo.com";
    handlersMock.POST.mockResolvedValue(failingLogin());

    // 10 failures in two 1-min windows (clearing the 5/min limiter between
    // them — the failure counter is separate and only success resets it).
    for (let batch = 0; batch < 2; batch++) {
      for (let i = 0; i < 5; i++) {
        const res = await postTo("/api/auth/callback/credentials", "203.0.113.7", email);
        // Passed through to NextAuth's mock (302 redirect, not a 429).
        expect(res.status).toBe(302);
      }
      accountLoginLimiter.clear();
    }

    // 10th failure armed the lockout — blocked now, even from a fresh IP.
    const blocked = await postTo("/api/auth/callback/credentials", "203.0.113.8", email);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeDefined();
    const body = await blocked.json();
    expect(body.error).toContain("bloqueada");
    expect(handlersMock.POST).toHaveBeenCalledTimes(10);
  });

  it("counts failures reported via the Auth.js 200 + { url } response", async () => {
    // The Auth.js browser client sends X-Auth-Return-Redirect, so NextAuth
    // answers 200 with JSON { url: "/login?error=..." } instead of a 302.
    // The wrapper must read the failure from the body or the lockout
    // would never arm for real browsers.
    const email = "alvo-json@exemplo.com";
    handlersMock.POST.mockResolvedValue(
      new Response(
        JSON.stringify({ url: "http://localhost/login?error=CredentialsSignin&code=credentials" }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    for (let batch = 0; batch < 2; batch++) {
      for (let i = 0; i < 5; i++) {
        const res = await postTo("/api/auth/callback/credentials", "203.0.113.1", email);
        expect(res.status).toBe(200);
      }
      accountLoginLimiter.clear();
    }

    // 10th failure (reported through the JSON url) armed the lockout.
    const blocked = await postTo("/api/auth/callback/credentials", "203.0.113.2", email);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeDefined();
  });

  it("emails the owner only when a successful login comes from a new IP", async () => {
    const email = "alvo-ip@exemplo.com";
    handlersMock.POST.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "http://localhost/dashboard" } })
    );

    // First successful login (IP A) — records the IP, no alert.
    await postTo("/api/auth/callback/credentials", "203.0.113.10", email);
    expect(emailMock.sendNewLoginEmail).not.toHaveBeenCalled();

    // Second successful login from a DIFFERENT IP — alert fires.
    await postTo("/api/auth/callback/credentials", "203.0.113.99", email);
    expect(emailMock.sendNewLoginEmail).toHaveBeenCalledTimes(1);
    expect(emailMock.sendNewLoginEmail.mock.calls[0][0]).toBe(email);

    // Same IP again — no alert.
    await postTo("/api/auth/callback/credentials", "203.0.113.99", email);
    expect(emailMock.sendNewLoginEmail).toHaveBeenCalledTimes(1);

    // The best-effort DB history write happened for each successful login.
    expect(dbMock.loginHistory.create).toHaveBeenCalledTimes(3);
    expect(dbMock.loginHistory.create.mock.calls[0][0].data.ipHash).toBeDefined();
  });

  it("resets the consecutive-failure counter on a successful login", async () => {
    const email = "alvo-reset@exemplo.com";
    handlersMock.POST.mockResolvedValue(failingLogin());
    for (let i = 0; i < 5; i++) {
      await postTo("/api/auth/callback/credentials", "203.0.113.1", email);
    }
    accountLoginLimiter.clear();

    // A successful login (redirect WITHOUT error=) clears the counter.
    handlersMock.POST.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "http://localhost/dashboard" } })
    );
    await postTo("/api/auth/callback/credentials", "203.0.113.1", email);
    accountLoginLimiter.clear();

    // 10 more failures from scratch → only then does the lockout arm.
    handlersMock.POST.mockResolvedValue(failingLogin());
    for (let batch = 0; batch < 2; batch++) {
      for (let i = 0; i < 5; i++) {
        const res = await postTo("/api/auth/callback/credentials", "203.0.113.1", email);
        // Passed through to NextAuth's mock (302 redirect, not a 429).
        expect(res.status).toBe(302);
      }
      accountLoginLimiter.clear();
    }

    const blocked = await postTo("/api/auth/callback/credentials", "203.0.113.1", email);
    expect(blocked.status).toBe(429);
  });

  it("keeps separate budgets per client IP", async () => {
    // IP A exhausts its budget...
    for (let i = 0; i < 60; i++) {
      await postTo("/api/auth/callback/credentials", "203.0.113.1");
    }
    expect((await postTo("/api/auth/callback/credentials", "203.0.113.1")).status).toBe(429);

    // ...while IP B is still allowed.
    const resB = await postTo("/api/auth/callback/credentials", "203.0.113.2");
    expect(resB.status).toBe(200);
  });

  it("never rate-limits OAuth callbacks", async () => {
    // Even after exhausting the credentials budget, Google callbacks pass.
    for (let i = 0; i < 60; i++) {
      await postTo("/api/auth/callback/credentials");
    }

    for (let i = 0; i < 25; i++) {
      const res = await postTo("/api/auth/callback/google");
      expect(res.status).toBe(200);
    }
    // All 25 google callbacks reached NextAuth.
    expect(handlersMock.POST).toHaveBeenCalledTimes(85);
  });

  it("GET delegates to the original handler and records OAuth sign-ins", async () => {
    // The GET wrapper passes through to Auth.js — verify it still answers
    // with the handler's response.
    handlersMock.GET.mockResolvedValue(new Response(null, { status: 200 }));
    const plain = await GET(new NextRequest("http://localhost/api/auth/session"));
    expect(plain.status).toBe(200);
    expect(handlersMock.GET).toHaveBeenCalledTimes(1);

    // OAuth callback path: the response carries a Set-Cookie session JWT.
    // Build a real Auth.js-compatible token (same HKDF derivation) so the
    // wrapper can decrypt it and attribute the login.
    process.env.AUTH_SECRET = "test-oauth-secret-0123456789abcdef";
    try {
      const key = await hkdf(
        "sha256",
        process.env.AUTH_SECRET,
        "authjs.session-token",
        "Auth.js Generated Encryption Key (authjs.session-token)",
        64
      );
      const token = await new EncryptJWT({ sub: "oauth-user-1", email: "oauth@test.com" })
        .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .encrypt(key);

      handlersMock.GET.mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { "set-cookie": `authjs.session-token=${token}; Path=/; HttpOnly` },
        })
      );

      const oauthRes = await GET(new NextRequest("http://localhost/api/auth/callback/google"));
      expect(oauthRes.status).toBe(302);

      // The login history was recorded with the decrypted userId and a hash
      // of the session token (never the raw token).
      expect(dbMock.loginHistory.create).toHaveBeenCalledTimes(1);
      const data = dbMock.loginHistory.create.mock.calls[0][0].data;
      expect(data.userId).toBe("user-1"); // resolved by the findUnique mock
      expect(data.sessionTokenHash).toBeDefined();
      expect(data.sessionTokenHash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      delete process.env.AUTH_SECRET;
    }
  });
});
