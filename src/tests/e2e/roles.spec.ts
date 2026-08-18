import { test, expect, type Browser } from "@playwright/test";
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
 * All three logins happen ONCE in beforeAll and the resulting
 * storageState is reused by each test.  This keeps the total number of
 * browser logins for admin@lms.com / lucas@lms.com / maria@email.com
 * at exactly one each, avoiding the accountLoginLimiter (5/min per
 * email) when many spec files run in parallel.
 */

let adminState: string;
let instructorState: string;
let studentState: string;

test.beforeAll(async ({ browser }) => {
  const tmpDir = os.tmpdir();

  // --- Admin login ---
  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await adminPage.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.100.10.${Date.now() % 200}` });
  await adminPage.goto("/login");
  await adminPage.fill("#email", "admin@lms.com");
  await adminPage.fill("#password", "admin123");
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL("/admin", { timeout: 20000 });
  adminState = path.join(tmpDir, `pds-roles-admin-${Date.now()}.json`);
  await adminCtx.storageState({ path: adminState });
  await adminCtx.close();

  // --- Instructor login ---
  const instrCtx = await browser.newContext();
  const instrPage = await instrCtx.newPage();
  await instrPage.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.100.11.${Date.now() % 200}` });
  await instrPage.goto("/login");
  await instrPage.fill("#email", "lucas@lms.com");
  await instrPage.fill("#password", "instrutor123");
  await instrPage.click('button[type="submit"]');
  await instrPage.waitForURL("/instrutor", { timeout: 20000 });
  instructorState = path.join(tmpDir, `pds-roles-instr-${Date.now()}.json`);
  await instrCtx.storageState({ path: instructorState });
  await instrCtx.close();

  // --- Student login ---
  const studCtx = await browser.newContext();
  const studPage = await studCtx.newPage();
  await studPage.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.100.12.${Date.now() % 200}` });
  await studPage.goto("/login");
  await studPage.fill("#email", "maria@email.com");
  await studPage.fill("#password", "123456");
  await studPage.click('button[type="submit"]');
  await studPage.waitForURL("/dashboard", { timeout: 20000 });
  studentState = path.join(tmpDir, `pds-roles-stud-${Date.now()}.json`);
  await studCtx.storageState({ path: studentState });
  await studCtx.close();
});

async function openWithState(
  browser: Browser,
  storageState: string,
  url: string,
): Promise<{ page: import("@playwright/test").Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  await page.goto(url);
  return { page, close: () => context.close() };
}

test.describe("Role-based post-login redirects", () => {
  test("admin lands on /admin with the admin dashboard", async ({ browser }) => {
    const { page, close } = await openWithState(browser, adminState, "/admin");
    await page.waitForURL("/admin", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard Administrativo" })
    ).toBeVisible({ timeout: 15000 });
    await close();
  });

  test("instructor lands on /instrutor with the instructor panel", async ({ browser }) => {
    const { page, close } = await openWithState(browser, instructorState, "/instrutor");
    await page.waitForURL("/instrutor", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard do Instrutor" }).first()
    ).toBeVisible({ timeout: 15000 });
    await close();
  });

  test("student lands on /dashboard with the student dashboard", async ({ browser }) => {
    const { page, close } = await openWithState(browser, studentState, "/dashboard");
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /Ol[aá],/i }).first()
    ).toBeVisible({ timeout: 15000 });
    await close();
  });
});
