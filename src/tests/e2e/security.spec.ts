import { test, expect, type Page } from "@playwright/test";

/**
 * Rate-limit e2e (authLimiter: 60 credential POSTs/min per IP + 5/min per
 * account).
 *
 * The limiters key on the `x-forwarded-for` header (IP) and the form `email`
 * (account), so each attempt sends a unique fake IP AND a unique email to get
 * its own isolated buckets — it never touches the "anonymous"/shared buckets
 * used by the browser-based login tests (login.spec, admin.spec), which keeps
 * the whole suite green in parallel.
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

  /** Unique account per attempt so the 5/min per-account limiter can't
   *  interfere with the IP-bucket test. */
  function fakeEmail(): string {
    return `e2e-rate-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
  }

  async function getCsrfToken(page: Page): Promise<string> {
    const res = await page.request.get("/api/auth/csrf");
    expect(res.status()).toBe(200);
    const body = await res.json();
    return body.csrfToken;
  }

  function loginAttempt(page: Page, ip: string, csrfToken: string, email: string) {
    return page.request.post("/api/auth/callback/credentials", {
      headers: { "x-forwarded-for": ip },
      form: { csrfToken, email, password: "wrongpass" },
    });
  }

  /**
   * Answers the anti-bot math challenge when the account requires it (≥ 3
   * consecutive failures), mimicking an attacker that solves it — so the
   * rate-limit/lockout layers still get exercised.
   */
  async function loginAttemptSolvingChallenge(
    page: Page,
    ip: string,
    csrfToken: string,
    email: string
  ) {
    const challenge = await (
      await page.request.get(`/api/auth/challenge?email=${encodeURIComponent(email)}`)
    ).json();
    const form: Record<string, string> = { csrfToken, email, password: "wrongpass" };
    if (challenge.required) {
      const [a, b] = challenge.question.match(/\d+/g)!.map(Number);
      form.challengeToken = challenge.token;
      form.challengeAnswer = String(a + b);
    }
    return page.request.post("/api/auth/callback/credentials", {
      headers: { "x-forwarded-for": ip },
      form,
    });
  }

  test("returns 429 after exceeding the login attempt limit", async ({ page }) => {
    const ip = fakeIp();
    const csrfToken = await getCsrfToken(page);

    // The first attempt is never rate-limited.
    const first = await loginAttempt(page, ip, csrfToken, fakeEmail());
    expect(first.status()).not.toBe(429);

    // Burn the remaining budget (attempts 2–60 pass the limiter).
    for (let i = 2; i <= 60; i++) {
      const res = await loginAttempt(page, ip, csrfToken, fakeEmail());
      expect(res.status()).not.toBe(429);
    }

    // Attempt 61 crosses the 60/min per-IP ceiling.
    const blocked = await loginAttempt(page, ip, csrfToken, fakeEmail());
    expect(blocked.status()).toBe(429);
    const body = await blocked.json();
    expect(body.error).toContain("Muitas requisições");
  });

  test("locks an account for 15 min after 10 consecutive failures", async ({ page }) => {
    // The test deliberately waits out a 1-min rate-limit window between the
    // two failure batches — needs more than the 30s default timeout.
    test.setTimeout(120_000);
    const ip = fakeIp();
    const email = `e2e-lock-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
    const csrfToken = await getCsrfToken(page);

    // 10 failed attempts across two 1-min windows — the 5/min per-account
    // limiter would 429 at attempt 6, so wait the window out in between.
    // The failure counter itself is separate and only a success resets it.
    // Each attempt answers the anti-bot challenge (required after 3
    // failures) so the failures keep counting toward the lockout.
    for (let i = 0; i < 5; i++) {
      const res = await loginAttemptSolvingChallenge(page, ip, csrfToken, email);
      expect(res.status()).not.toBe(429);
    }
    await page.waitForTimeout(61_000);
    for (let i = 0; i < 5; i++) {
      const res = await loginAttemptSolvingChallenge(page, ip, csrfToken, email);
      expect(res.status()).not.toBe(429);
    }

    // The 10th failure armed the lockout — the next attempt is blocked
    // with Retry-After + X-RateLimit-* headers (it still answers the
    // challenge, so the 429 must come from the lockout, not the challenge).
    const blocked = await loginAttemptSolvingChallenge(page, ip, csrfToken, email);
    expect(blocked.status()).toBe(429);
    expect(blocked.headers()["retry-after"]).toBeDefined();
    expect(Number(blocked.headers()["x-ratelimit-remaining"])).toBe(0);
    const body = await blocked.json();
    expect(body.error).toContain("bloqueada");
  });

  test("requires the anti-bot challenge after 3 consecutive failures on the same account", async ({ page }) => {
    const email = `e2e-challenge-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
    const csrfToken = await getCsrfToken(page);

    // 3 failed attempts on the SAME account (unique IPs so the per-IP
    // bucket stays out of the picture) — each passes through to NextAuth.
    for (let i = 0; i < 3; i++) {
      const res = await loginAttempt(page, fakeIp(), csrfToken, email);
      expect(res.status()).not.toBe(429);
    }

    // The challenge endpoint now reports the account as requiring it.
    const challenge = await page.request.get(`/api/auth/challenge?email=${encodeURIComponent(email)}`);
    expect(challenge.status()).toBe(200);
    const challengeBody = await challenge.json();
    expect(challengeBody.required).toBe(true);
    expect(challengeBody.question).toMatch(/^Quanto é \d+ \+ \d+\?$/);
    expect(challengeBody.token).toBeTruthy();

    // A 4th attempt WITHOUT answering the challenge is rejected with 400
    // and the X-Challenge-Required header — it never reaches NextAuth.
    const blocked = await loginAttempt(page, fakeIp(), csrfToken, email);
    expect(blocked.status()).toBe(400);
    expect(blocked.headers()["x-challenge-required"]).toBe("1");
    const body = await blocked.json();
    expect(body.error).toContain("desafio");
  });

  test("exposes X-RateLimit-* headers on rate-limited responses", async ({ page }) => {
    const ip = fakeIp();
    const csrfToken = await getCsrfToken(page);

    // Allowed attempts are delegated to the NextAuth handler untouched, so
    // the headers only appear on the 429 response (by design).
    // Burn the bucket — every allowed attempt must NOT be rate-limited.
    for (let i = 1; i <= 60; i++) {
      const res = await loginAttempt(page, ip, csrfToken, fakeEmail());
      expect(res.status()).not.toBe(429);
    }

    // The 429 carries the standard headers with remaining=0.
    const blocked = await loginAttempt(page, ip, csrfToken, fakeEmail());
    expect(blocked.status()).toBe(429);
    expect(blocked.headers()["x-ratelimit-limit"]).toBe("60");
    expect(blocked.headers()["x-ratelimit-remaining"]).toBe("0");
    expect(blocked.headers()["x-ratelimit-reset"]).toBeDefined();
    expect(Number(blocked.headers()["x-ratelimit-reset"])).toBeGreaterThan(0);
  });
});
