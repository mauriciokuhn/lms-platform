import { test, expect } from "@playwright/test";

/**
 * i18n e2e.
 *
 * The LocaleSwitcher persists the chosen locale to localStorage AND a
 * `locale` cookie (path=/). Server components like /privacidade read that
 * cookie via getServerTranslation() — this spec proves the whole flow
 * end-to-end: toggle in the UI → cookie set → server-rendered page
 * translated. Each test gets a fresh browser context, so cookies never
 * leak between tests.
 */
test.describe("i18n", () => {
  test("server pages default to pt-BR without a locale cookie", async ({ page }) => {
    await page.goto("/privacidade");
    await expect(
      page.getByRole("heading", { name: "Política de Privacidade" })
    ).toBeVisible();
  });

  test("LocaleSwitcher persists the cookie and server pages translate to English", async ({ page }) => {
    // The switcher lives in the header and shows the CURRENT locale
    // ("🇧🇷 Português" by default); clicking it toggles to English.
    // `.first()` keeps the selector resilient if a second locale control
    // is ever added to the page.
    await page.goto("/");
    await page.getByRole("button", { name: /Português/ }).first().click();

    // The switcher reloads the page; wait until it shows the new locale.
    await expect(page.getByRole("button", { name: /English/ })).toBeVisible();

    // The cookie must be written so server components can translate.
    const localeCookie = (await page.context().cookies()).find(
      (c) => c.name === "locale"
    );
    expect(localeCookie?.value).toBe("en");

    // Server-rendered page must now render the English strings.
    await page.goto("/privacidade");
    await expect(
      page.getByRole("heading", { name: "Privacy Policy" })
    ).toBeVisible();
    await expect(page.getByText("Last updated: July 2026")).toBeVisible();
  });
});
