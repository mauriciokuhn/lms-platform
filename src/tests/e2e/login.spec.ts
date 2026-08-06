import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Entrar");
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('#email', "wrong@email.com");
    await page.fill('#password', "wrongpass");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator("text=inválidos")).toBeVisible({ timeout: 5000 });
  });

  test("should redirect admin to the admin panel after login", async ({ page }) => {
    await page.goto("/login");
    await page.fill('#email', "admin@lms.com");
    await page.fill('#password', "admin123");
    await page.click('button[type="submit"]');

    // Admins land on their role home (/admin), not the student dashboard
    await page.waitForURL("/admin", { timeout: 10000 });
    await expect(page.locator("text=Dashboard Administrativo")).toBeVisible();
  });

  test("should display register page", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1")).toContainText("Criar");
  });
});
