import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Entrar");
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "wrong@email.com");
    await page.fill('input[name="password"]', "wrongpass");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator("text=inválidos")).toBeVisible({ timeout: 5000 });
  });

  test("should redirect to dashboard after login", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@lms.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL("/dashboard", { timeout: 10000 });
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("should display register page", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1")).toContainText("Criar");
  });
});
