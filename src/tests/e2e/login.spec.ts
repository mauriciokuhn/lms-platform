import { test, expect } from "@playwright/test";
import { registerUser } from "./register";

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Entrar");
  });

  test("should show error for invalid credentials", async ({ page }) => {
    // Unique account so the anti-bot challenge (≥3 failures on the SAME
    // account) can never hijack this test across suite runs.
    const email = `e2e-invalid-${Date.now()}@test.com`;
    await page.goto("/login");
    await page.fill('#email', email);
    await page.fill('#password', "wrongpass");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator("text=inválidos")).toBeVisible({ timeout: 5000 });
  });

  test("records each successful login in the session history (hashed IPs)", async ({ page }) => {
    // Dedicated account via the register UI so the login-history counts are
    // ours alone (the register itself performs one successful login).
    const email = await registerUser(page);

    // Verify the user exists via the profile API (avoids direct DB access
    // which can point to a different SQLite file in the Playwright worker).
    const profile1 = await (await page.request.get("/api/profile")).json();
    expect(profile1.user?.email).toBe(email);
    // Baseline: the register UI itself performed one successful login.
    const baseline = profile1.recentLogins?.length ?? 0;
    expect(baseline).toBeGreaterThanOrEqual(1);

    // Two more successful credential logins from DIFFERENT IPs (the API
    // context sends x-forwarded-for, like the rate-limit specs).
    async function loginAs(ip: string) {
      const csrf = await (await page.request.get("/api/auth/csrf")).json();
      const res = await page.request.post("/api/auth/callback/credentials", {
        headers: { "x-forwarded-for": ip },
        form: { csrfToken: csrf.csrfToken, email, password: "teste123" },
      });
      expect(res.status()).toBe(200);
    }
    await loginAs("10.20.30.40");
    await loginAs("10.20.30.99");

    // The profile API shows the session history (hashed IPs).
    const profile2 = await (await page.request.get("/api/profile")).json();
    expect(profile2.recentLogins.length).toBeGreaterThanOrEqual(baseline + 2);
    // The two API logins are the newest records, each with a distinct hash.
    const hashes = profile2.recentLogins.map((l: { ipHash: string }) => l.ipHash);
    expect(hashes[0]).not.toBe(hashes[1]);
    expect(hashes[0]).toMatch(/^[0-9a-f]{64}$/);
  });

  test("revoking a remote session invalidates its token via the middleware", async ({ page, playwright }) => {
    const email = await registerUser(page);

    // Two API logins without following the redirect: Auth.js re-encrypts
    // the JWE (new IV) on every response, so the Set-Cookie we capture here
    // is exactly the one the wrapper hashed into the login history.
    async function loginAndCaptureToken(ip: string): Promise<string> {
      const csrf = await (await page.request.get("/api/auth/csrf")).json();
      const res = await page.request.post("/api/auth/callback/credentials", {
        headers: { "x-forwarded-for": ip },
        form: { csrfToken: csrf.csrfToken, email, password: "teste123" },
        maxRedirects: 0,
      });
      expect(res.status()).toBe(302);
      const setCookie = (res.headers()["set-cookie"] ?? "").toString();
      const token = setCookie
        .split(";")[0]
        .replace("authjs.session-token=", "");
      expect(token.length).toBeGreaterThan(50);
      return token;
    }
    const tokenA = await loginAndCaptureToken("10.10.10.10"); // older session A
    await loginAndCaptureToken("10.10.10.99"); // newer session B stays in the jar

    // The profile marks the newest session as current and exposes the older
    // one for revocation.
    const profile = await (await page.request.get("/api/profile")).json();
    expect(profile.recentLogins[0].isCurrent).toBe(true);
    const older = profile.recentLogins[1];
    expect(older.isCurrent).toBe(false);

    // Revoke the older session.
    const revokeRes = await page.request.post(`/api/profile/sessions/${older.id}/revoke`);
    expect(revokeRes.status()).toBe(200);

    // Sanity: the NOT-revoked cookie (still in the shared jar after the last
    // login) still reaches the dashboard.
    const okRes = await page.request.get("/dashboard", { maxRedirects: 0 });
    expect(okRes.status()).toBe(200);

    // The revoked cookie is rejected by the proxy: a fresh context carrying
    // token A is bounced to /login?error=SessionRevoked.
    const oldCtx = await playwright.request.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: { cookie: `authjs.session-token=${tokenA}` },
    });
    const blocked = await oldCtx.get("/dashboard", { maxRedirects: 0 });
    expect([302, 307]).toContain(blocked.status());
    expect(blocked.headers()["location"] ?? "").toContain("SessionRevoked");
    await oldCtx.dispose();
  });

  test("shows the anti-bot challenge after repeated failed logins", async ({ page }) => {
    // Unique account (never registered) so the failure counter is ours alone
    // and the per-account rate limiter (5/min) can't interfere.
    const email = `e2e-ui-challenge-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
    await page.goto("/login");

    // 3 failed attempts on the same account — after the 3rd, the login
    // form must ask the anti-bot math challenge.
    for (let attempt = 1; attempt <= 3; attempt++) {
      await page.fill("#email", email);
      await page.fill("#password", "wrongpass");
      await page.click('button[type="submit"]');
      await expect(page.locator("text=inválidos")).toBeVisible({ timeout: 10_000 });
      // Wait for the submit to finish before the next attempt.
      await expect(page.locator('button[type="submit"]')).toBeEnabled();
    }

    // The challenge card with the math question appears after the 3rd failure.
    await expect(page.locator("text=Verificação de segurança")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Quanto é")).toBeVisible();
    // The answer field is focused for a quick reply.
    await expect(page.locator("#challenge")).toBeFocused();
  });

  // NOTE: the "admin lands on /admin" redirect is tested in roles.spec.ts.
  // Duplicating it here would add another admin@lms.com login, pushing the
  // suite past the accountLoginLimiter (5/min per email).

  test("2FA: valid credentials show the code panel and the session stays blocked until verified", async ({ page, playwright, browser }) => {
    const email = `e2e-2fa-${Date.now()}@test.com`;

    // Register via the API with a unique IP (avoids rate-limit and PrismaClient
    // path issues). Then enable 2FA via the profile PATCH endpoint.
    const regRes = await page.request.post("/api/register", {
      headers: { "x-forwarded-for": `10.50.${Math.floor(Math.random() * 255)}.1`, "content-type": "application/json" },
      data: JSON.stringify({ name: "Aluno 2FA", email, password: "teste123" }),
    });
    expect(regRes.status()).toBe(201);

    // Log in to get a session, then enable 2FA.
    const csrf2 = await (await page.request.get("/api/auth/csrf")).json();
    await page.request.post("/api/auth/callback/credentials", {
      headers: { "x-forwarded-for": `10.50.${Math.floor(Math.random() * 255)}.2` },
      form: { csrfToken: csrf2.csrfToken, email, password: "teste123" },
    });
    const patchRes = await page.request.patch("/api/profile", {
      headers: { "content-type": "application/json" },
      data: JSON.stringify({ twoFactorEnabled: true }),
    });
    expect(patchRes.status()).toBe(200);
    // Logout so the next login triggers 2FA.
    await page.request.get("/api/auth/signout");

    // Fresh context (no cookies): the login must now stop at the code panel.
    const ctx = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    const csrf = await (await ctx.get("/api/auth/csrf")).json();
    const res = await ctx.post("/api/auth/callback/credentials", {
      form: { csrfToken: csrf.csrfToken, email, password: "teste123" },
    });
    expect(res.status()).toBe(202); // TwoFactorRequired
    // No session cookie was issued.
    const session = await (await ctx.get("/api/auth/session")).json();
    expect(session?.user).toBeFalsy();
    await ctx.dispose();

    // Browser flow (fresh context — the register session must not leak in):
    // the 2FA panel appears after submitting the credentials.
    const uiCtx = await browser.newContext();
    const uiPage = await uiCtx.newPage();
    await uiPage.goto("/login");
    await uiPage.fill("#email", email);
    await uiPage.fill("#password", "teste123");
    await uiPage.click('button[type="submit"]');
    await expect(uiPage.locator("text=Verificação em duas etapas")).toBeVisible({ timeout: 10000 });
    await expect(uiPage.locator("text=Código de verificação enviado para seu e-mail")).toBeVisible();

    // A wrong code is rejected and the account stays unauthenticated.
    await uiPage.fill("#twoFactor", "000000");
    await uiPage.getByRole("button", { name: "Verificar código" }).click();
    await expect(uiPage.locator("text=Código inválido ou expirado")).toBeVisible({ timeout: 10000 });

    const stillNoSession = await (await uiPage.request.get("/api/auth/session")).json();
    expect(stillNoSession?.user).toBeFalsy();
    await uiCtx.close();
  });

  test("2FA happy path: a recovery code completes the login and opens the session", async ({ browser }) => {
    const email = `e2e-2fa-full-${Date.now()}@test.com`;

    // Register via API (unique IP), enable 2FA, generate recovery codes —
    // all through HTTP, avoiding PrismaClient path issues in the Playwright worker.
    const regRes = await browser.newPage().then(async (p) => {
      const r = await p.request.post("/api/register", {
        headers: { "x-forwarded-for": `10.60.${Math.floor(Math.random() * 255)}.1`, "content-type": "application/json" },
        data: JSON.stringify({ name: "Aluno 2FA Completo", email, password: "teste123" }),
      });
      await p.close();
      return r;
    });
    expect(regRes.status()).toBe(201);

    // Log in, enable 2FA, generate recovery codes, logout.
    const setupCtx = await browser.newContext();
    const setupPage = await setupCtx.newPage();
    await setupPage.goto("/login");
    await setupPage.fill("#email", email);
    await setupPage.fill("#password", "teste123");
    await setupPage.click('button[type="submit"]');
    await setupPage.waitForURL(/\/dashboard/, { timeout: 30000 });
    // Enable 2FA.
    const patchRes = await setupPage.request.patch("/api/profile", {
      headers: { "content-type": "application/json" },
      data: JSON.stringify({ twoFactorEnabled: true }),
    });
    expect(patchRes.status()).toBe(200);
    // Generate recovery codes and capture them.
    const codesRes = await setupPage.request.post("/api/profile/2fa/recovery-codes");
    expect(codesRes.status()).toBe(200);
    const { codes } = await codesRes.json();
    const recoveryCode = codes[0]; // e.g. "K7XQ-9M2P"
    expect(recoveryCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    // Logout.
    await setupPage.request.get("/api/auth/signout");
    await setupCtx.close();

    // Fresh browser: valid credentials → 2FA panel → recovery code → session.
    const uiCtx = await browser.newContext();
    const uiPage = await uiCtx.newPage();
    await uiPage.goto("/login");
    await uiPage.fill("#email", email);
    await uiPage.fill("#password", "teste123");
    await uiPage.click('button[type="submit"]');
    await expect(uiPage.locator("text=Verificação em duas etapas")).toBeVisible({ timeout: 10000 });

    // The recovery code is one-time: entering it lands on the dashboard.
    await uiPage.fill("#twoFactor", recoveryCode);
    await uiPage.getByRole("button", { name: "Verificar código" }).click();
    await uiPage.waitForURL(/\/dashboard/, { timeout: 30000 });

    // The code was consumed — a second login with it is rejected.
    const second = await browser.newContext();
    const secondPage = await second.newPage();
    await secondPage.goto("/login");
    await secondPage.fill("#email", email);
    await secondPage.fill("#password", "teste123");
    await secondPage.click('button[type="submit"]');
    await expect(secondPage.locator("text=Verificação em duas etapas")).toBeVisible({ timeout: 10000 });
    await secondPage.fill("#twoFactor", recoveryCode);
    await secondPage.getByRole("button", { name: "Verificar código" }).click();
    await expect(secondPage.locator("text=Código inválido ou expirado")).toBeVisible({ timeout: 10000 });
    await second.close();
    await uiCtx.close();
  });

  test("should display register page", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1")).toContainText("Criar");
  });
});
