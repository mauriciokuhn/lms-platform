import { test, expect, type Page } from "@playwright/test";

/**
 * The dev server (Turbopack, one per project directory) briefly refuses
 * connections while on-demand compiling the heavy /admin route. Wrap
 * navigations in a small retry loop so the suite is resilient to that
 * transient ERR_CONNECTION_REFUSED instead of failing the whole run.
 */
async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await page.goto(url, { timeout: 30000 });
      return;
    } catch (err) {
      const msg = String(err);
      if (!msg.includes("ERR_CONNECTION_REFUSED") && !msg.includes("ERR_CONNECTION_RESET")) {
        throw err;
      }
      if (i === attempts) throw err;
      // Give the dev server a moment to finish on-demand compilation.
      await page.waitForTimeout(3000);
    }
  }
}

test.describe("Admin Panel", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await gotoWithRetry(page, "/admin");
    await page.waitForURL("/login", { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Entrar");
  });

  test("should access admin after login", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('#email', "admin@lms.com");
    await page.fill('#password', "admin123");
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/dashboard|\/admin/, { timeout: 10000 });

    // Navigate to admin
    await gotoWithRetry(page, "/admin");
    // The heading appears in the page title AND the sidebar/mobile menu,
    // so scope to the role=heading to avoid a strict-mode violation.
    await expect(
      page.getByRole("heading", { name: "Dashboard Administrativo" })
    ).toBeVisible();
  });

  test("should display course management page", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('#email', "admin@lms.com");
    await page.fill('#password', "admin123");
    await page.click('button[type="submit"]');

    // Wait for the async signIn to complete and the session cookie to be set
    // BEFORE navigating to a protected route (production is fast enough that
    // an immediate goto races the login and lands on /login instead).
    await page.waitForURL(/\/dashboard|\/admin/, { timeout: 10000 });

    // Navigate to admin courses
    await gotoWithRetry(page, "/admin/cursos");
    // During the load/hydration transition the DOM can briefly hold two
    // identical page headers (server-rendered + hydrated copy). Scope to the
    // heading role and take the first match so the assertion is resilient to
    // that transient duplicate, like the dashboard test above.
    await expect(
      page.getByRole("heading", { name: "Cursos", level: 1 }).first()
    ).toBeVisible();
  });
});
