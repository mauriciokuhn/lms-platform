import { test, expect, type Page } from "@playwright/test";

/**
 * Role-based post-login redirects:
 *   - ADMIN      → /admin      (admin panel)
 *   - INSTRUCTOR → /instrutor  (instructor panel)
 *   - STUDENT    → /dashboard  (student dashboard)
 *
 * These credentials come from prisma/seed.ts. Each test logs in through the
 * real login form and asserts the final URL + a role-specific heading.
 */

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
}

test.describe("Role-based post-login redirects", () => {
  test("admin lands on /admin with the admin dashboard", async ({ page }) => {
    await login(page, "admin@lms.com", "admin123");
    await page.waitForURL("/admin", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard Administrativo" })
    ).toBeVisible({ timeout: 15000 });
  });

  test("instructor lands on /instrutor with the instructor panel", async ({ page }) => {
    await login(page, "lucas@lms.com", "instrutor123");
    await page.waitForURL("/instrutor", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard do Instrutor" }).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("student lands on /dashboard with the student dashboard", async ({ page }) => {
    await login(page, "maria@email.com", "123456");
    await page.waitForURL("/dashboard", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /Ol[aá],/i }).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
