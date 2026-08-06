/**
 * Unit tests for the rate limiter factory (src/lib/rate-limit.ts).
 *
 * Two paths are covered:
 *  1. In-memory fallback — runs when UPSTASH_REDIS_REST_URL/TOKEN are unset
 *     (local dev, tests). Buckets are per-process and keyed by client IP.
 *  2. Redis path — @upstash/ratelimit and @upstash/redis are mocked below so
 *     no network is involved; the factory must construct the Upstash limiter,
 *     call limit(ip), and map its result into the X-RateLimit-* shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks (hoisted BEFORE the module under test is imported) ────────────
const limitMock = vi.hoisted(() => vi.fn());

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow(max: number, duration: string) {
      return { max, duration };
    }
    limit = limitMock;
    reset = vi.fn();
  }
  return { Ratelimit };
});

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({})),
}));

function requestFrom(ip = "203.0.113.9"): Request {
  return new NextRequest("http://localhost/api/auth/callback/credentials", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("rateLimit — in-memory fallback (no Redis env)", () => {
  it("allows requests up to maxRequests, then blocks and reports headers", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const limiter = rateLimit({ maxRequests: 3, windowMs: 60_000 });

    expect((await limiter.check(requestFrom())).allowed).toBe(true);
    expect((await limiter.check(requestFrom())).allowed).toBe(true);
    expect((await limiter.check(requestFrom())).allowed).toBe(true);

    const blocked = await limiter.check(requestFrom());
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.headers["X-RateLimit-Limit"]).toBe("3");
    expect(blocked.headers["X-RateLimit-Remaining"]).toBe("0");
    expect(Number(blocked.headers["X-RateLimit-Reset"])).toBeGreaterThan(0);
    expect(blocked.error).toContain("Muitas requisições");
  });

  it("decrements the remaining budget as requests are consumed", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const limiter = rateLimit({ maxRequests: 5, windowMs: 60_000 });

    const first = await limiter.check(requestFrom());
    expect(first.remaining).toBe(4);
    expect(first.headers["X-RateLimit-Remaining"]).toBe("4");

    const second = await limiter.check(requestFrom());
    expect(second.remaining).toBe(3);
  });

  it("keeps separate buckets per client IP", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const limiter = rateLimit({ maxRequests: 2, windowMs: 60_000 });

    await limiter.check(requestFrom("203.0.113.1"));
    await limiter.check(requestFrom("203.0.113.1"));
    expect((await limiter.check(requestFrom("203.0.113.1"))).allowed).toBe(false);

    // A different IP still has its own fresh budget.
    expect((await limiter.check(requestFrom("203.0.113.2"))).allowed).toBe(true);
  });

  it("resets after clear()", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const limiter = rateLimit({ maxRequests: 1, windowMs: 60_000 });

    expect((await limiter.check(requestFrom())).allowed).toBe(true);
    expect((await limiter.check(requestFrom())).allowed).toBe(false);

    limiter.clear();
    expect((await limiter.check(requestFrom())).allowed).toBe(true);
  });
});

describe("rateLimit — Redis path (UPSTASH env set, packages mocked)", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    limitMock.mockReset();
  });

  it("uses Redis and maps an allowed result", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const limiter = rateLimit({ maxRequests: 10, windowMs: 60_000 });

    limitMock.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 7,
      reset: Date.now() + 30_000,
    });

    const res = await limiter.check(requestFrom("203.0.113.42"));
    expect(limitMock).toHaveBeenCalledTimes(1);
    expect(limitMock).toHaveBeenCalledWith("203.0.113.42");
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(7);
    expect(res.headers["X-RateLimit-Limit"]).toBe("10");
    expect(res.headers["X-RateLimit-Remaining"]).toBe("7");
    expect(res.error).toBeUndefined();
  });

  it("maps a blocked Redis result into the 429 shape", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const limiter = rateLimit({ maxRequests: 10, windowMs: 60_000 });

    const reset = Date.now() + 45_000;
    limitMock.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset,
    });

    const res = await limiter.check(requestFrom());
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
    expect(res.headers["X-RateLimit-Remaining"]).toBe("0");
    expect(res.resetIn).toBeGreaterThan(0);
    expect(res.error).toContain("Muitas requisições");
    expect(res.error).toContain("45 segundos");
  });

  it("falls back to in-memory when the Redis call fails at runtime", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const limiter = rateLimit({ maxRequests: 2, windowMs: 60_000 });

    limitMock.mockRejectedValue(new Error("network down"));

    // Redis throws → served by the in-memory fallback with its own budget.
    expect((await limiter.check(requestFrom())).allowed).toBe(true);
    expect((await limiter.check(requestFrom())).allowed).toBe(true);
    const blocked = await limiter.check(requestFrom());
    expect(blocked.allowed).toBe(false);
    expect(blocked.error).toContain("Muitas requisições");
  });

  it("keeps using Redis only when env is configured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { rateLimit } = await import("@/lib/rate-limit");
    const limiter = rateLimit({ maxRequests: 1, windowMs: 60_000 });

    // No env → in-memory path, Redis mock never touched.
    expect((await limiter.check(requestFrom())).allowed).toBe(true);
    expect(limitMock).not.toHaveBeenCalled();
  });
});
