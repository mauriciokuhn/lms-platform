/**
 * Route-level tests for the rate-limited NextAuth wrapper
 * (src/app/api/auth/[...nextauth]/route.ts).
 *
 * The wrapper applies authLimiter (10 req/min per IP) ONLY to the
 * /callback/credentials path — brute-force protection for password login.
 * OAuth callbacks (/callback/google) must never be limited.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
const handlersMock = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ handlers: handlersMock }));

import { GET, POST } from "@/app/api/auth/[...nextauth]/route";
import { authLimiter } from "@/lib/rate-limit";

function postTo(path: string, ip = "203.0.113.10") {
  const request = new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
  return POST(request);
}

describe("Rate-limited NextAuth POST wrapper", () => {
  beforeEach(() => {
    // Reset the shared in-memory limiter between tests.
    authLimiter.clear();
    handlersMock.POST.mockReset();
    handlersMock.POST.mockResolvedValue(new Response("ok", { status: 200 }));
  });

  it("passes credentials requests through to NextAuth while under the limit", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await postTo("/api/auth/callback/credentials");
      expect(res.status).toBe(200);
    }
    expect(handlersMock.POST).toHaveBeenCalledTimes(10);
  });

  it("returns 429 after exceeding the limit on the credentials callback", async () => {
    // Consume all 10 allowed requests.
    for (let i = 0; i < 10; i++) {
      await postTo("/api/auth/callback/credentials");
    }

    const res = await postTo("/api/auth/callback/credentials");
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Muitas requisições");
    // NextAuth must NOT be invoked for the rejected request.
    expect(handlersMock.POST).toHaveBeenCalledTimes(10);
  });

  it("keeps separate budgets per client IP", async () => {
    // IP A exhausts its budget...
    for (let i = 0; i < 10; i++) {
      await postTo("/api/auth/callback/credentials", "203.0.113.1");
    }
    expect((await postTo("/api/auth/callback/credentials", "203.0.113.1")).status).toBe(429);

    // ...while IP B is still allowed.
    const resB = await postTo("/api/auth/callback/credentials", "203.0.113.2");
    expect(resB.status).toBe(200);
  });

  it("never rate-limits OAuth callbacks", async () => {
    // Even after exhausting the credentials budget, Google callbacks pass.
    for (let i = 0; i < 10; i++) {
      await postTo("/api/auth/callback/credentials");
    }

    for (let i = 0; i < 25; i++) {
      const res = await postTo("/api/auth/callback/google");
      expect(res.status).toBe(200);
    }
    // All 25 google callbacks reached NextAuth.
    expect(handlersMock.POST).toHaveBeenCalledTimes(35);
  });

  it("exports the original GET handler untouched", () => {
    expect(GET).toBe(handlersMock.GET);
  });
});
