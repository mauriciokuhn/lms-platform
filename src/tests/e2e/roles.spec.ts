import { test, expect } from "@playwright/test";
import path from "path";
import os from "os";

/**
 * Role-based post-login redirects:
 *   - ADMIN      → /admin      (admin panel)
 *   - INSTRUCTOR → /instrutor  (instructor panel)
 *   - STUDENT    → /dashboard  (student dashboard)
 *
 * These credentials come from prisma/seed.ts.
 *
 * The admin login is shared via a beforeAll that saves storageState,
 * so only ONE browser login happens for admin@lms.com across all 3
 * tests (avoids the accountLoginLimiter 5/min per email).
 */

let adminState: string;

test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.fill("#email", "admin@lms.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("/admin", { timeout: 20000 });
  adminState = path.join(os.tmpdir(), `pds-roles-${Date.now()}.json`);
  await ctx.storageState({ path: adminState });
  await ctx.close();
});

test.describe("Role-based post-login redirects", () => {
  test("admin lands on /admin with the admin dashboard", async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminState });
    const page = await context.newPage();
    await page.goto("/admin");
    await page.waitForURL("/admin", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard Administrativo" })
    ).toBeVisible({ timeout: 15000 });
    await context.close();
  });

  test("instructor lands on /instrutor with the instructor panel", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.fill("#email", "lucas@lms.com");
    await page.fill("#password", "instrutor123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/instrutor", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard do Instrutor" }).first()
    ).toBeVisible({ timeout: 15000 });
    await context.close();
  });

  test("student lands on /dashboard with the student dashboard", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.fill("#email", "maria@email.com");
    await page.fill("#password", "123456");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /Ol[aá],/i }).first()
    ).toBeVisible({ timeout: 15000 });
    await context.close();
  });
});
