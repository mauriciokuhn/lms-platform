import { test, expect, type Page } from "@playwright/test";

/**
 * Rate-limit e2e (authLimiter: 10 credential POSTs/min per IP).
 *
 * The limiter keys on the `x-forwarded-for` request header, so each test
 * sends a unique fake IP to get its own isolated bucket — it never touches
 * the "anonymous" bucket shared by the browser-based login tests
 * (login.spec, admin.spec), which keeps the whole suite green in parallel.
 *
 * Flow per attempt: GET /api/auth/csrf (sets the CSRF cookie in the shared
 * context) → POST /api/auth/callback/credentials as form-urlencoded, exactly
 * like next-auth/react's signIn does.
 *
 * NOTE: the isolation relies on `x-forwarded-for` reaching the limiter
 * untouched, so these specs only run correctly against a direct server
 * (next dev / next start), not behind a proxy that rewrites that header.
 *
 * These specs exercise the in-memory limiter path (no UPSTASH_REDIS_* env in
 * the test server). The Upstash Redis path is covered by the mocked unit
 * tests in src/tests/api/rate-limit.test.ts — an e2e would require a real
 * (or memory-backed) Redis instance.
 */
test.describe("Rate Limit", () => {
  function fakeIp(): string {
    return `10.9${Math.floor(Math.random() * 8) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
  }

  async function getCsrfToken(page: Page): Promise<string> {
    const res = await page.request.get("/api/auth/csrf");
    expect(res.status()).toBe(200);
    const body = await res.json();
    return body.csrfToken;
  }

  function loginAttempt(page: Page, ip: string, csrfToken: string) {
    return page.request.post("/api/auth/callback/credentials", {
      headers: { "x-forwarded-for": ip },
      form: { csrfToken, email: "wrong@email.com", password: "wrongpass" },
    });
  }

  test("returns 429 after exceeding the login attempt limit", async ({ page }) => {
    const ip = fakeIp();
    const csrfToken = await getCsrfToken(page);

    // The first attempt is never rate-limited.
    const first = await loginAttempt(page, ip, csrfToken);
    expect(first.status()).not.toBe(429);

    // Burn the remaining budget (attempts 2–10 pass the limiter).
    for (let i = 2; i <= 10; i++) {
      const res = await loginAttempt(page, ip, csrfToken);
      expect(res.status()).not.toBe(429);
    }

    // Attempt 11 crosses the 10/min ceiling.
    const blocked = await loginAttempt(page, ip, csrfToken);
    expect(blocked.status()).toBe(429);
    const body = await blocked.json();
    expect(body.error).toContain("Muitas requisições");
  });

  test("exposes X-RateLimit-* headers on rate-limited responses", async ({ page }) => {
    const ip = fakeIp();
    const csrfToken = await getCsrfToken(page);

    // Allowed attempts are delegated to the NextAuth handler untouched, so
    // the headers only appear on the 429 response (by design).
    // Burn the bucket — every allowed attempt must NOT be rate-limited.
    for (let i = 1; i <= 10; i++) {
      const res = await loginAttempt(page, ip, csrfToken);
      expect(res.status()).not.toBe(429);
    }

    // The 429 carries the standard headers with remaining=0.
    const blocked = await loginAttempt(page, ip, csrfToken);
    expect(blocked.status()).toBe(429);
    expect(blocked.headers()["x-ratelimit-limit"]).toBe("10");
    expect(blocked.headers()["x-ratelimit-remaining"]).toBe("0");
    expect(blocked.headers()["x-ratelimit-reset"]).toBeDefined();
    expect(Number(blocked.headers()["x-ratelimit-reset"])).toBeGreaterThan(0);
  });
});
