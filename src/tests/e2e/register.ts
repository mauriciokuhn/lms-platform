import type { Page } from "@playwright/test";

/**
 * Shared e2e register helper.
 *
 * The register endpoint is rate-limited per IP (strictLimiter: 5/min). The
 * suite registers a fresh user in several specs that run in PARALLEL, so
 * without care they share the localhost IP bucket and trip the limiter
 * (the historic "resume/settings flaky" pattern). Each call therefore uses
 * its own synthetic client IP (x-forwarded-for, the same mechanism the
 * rate-limit specs use) so every register gets its own limiter bucket.
 */
let registerCounter = 0;

export async function registerUser(page: Page) {
  const ip = `10.99.0.${(registerCounter++ % 200) + 1}`;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });

  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
  await page.goto("/register");
  await page.fill("#name", "Aluno E2E");
  await page.fill("#email", email);
  await page.fill("#password", "teste123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  return email;
}
