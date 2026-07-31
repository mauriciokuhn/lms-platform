import { test, expect } from "@playwright/test";

test.describe("Admin Panel", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("/login");
    await expect(page.locator("h1")).toContainText("Entrar");
  });

  test("should access admin after login", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@lms.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/dashboard|\/admin/, { timeout: 10000 });

    // Navigate to admin
    await page.goto("/admin");
    await expect(page.locator("text=Dashboard Administrativo")).toBeVisible();
  });

  test("should display course management page", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@lms.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Navigate to admin courses
    await page.goto("/admin/cursos");
    await expect(page.locator("h1")).toContainText("Cursos");
  });
});
