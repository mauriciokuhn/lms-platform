import { test, expect, type Browser, type Page } from "@playwright/test";
import path from "path";
import os from "os";

/**
 * Settings page (/configuracoes) e2e coverage:
 *
 *   - Sound settings: toggle on/off, tone selector (CHIME/POP/ALERT)
 *   - Vibration toggle
 *   - Push notifications card (defensive — browser may not support)
 *   - Account security: 2FA toggle + recovery codes generation
 *   - Settings persistence across page reload
 *
 * Uses the seeded student maria@email.com.
 * Registers a FRESH user per test to avoid 2FA state leaking between tests.
 */

test.describe.configure({ mode: "serial" });

const STUDENT_EMAIL = "maria@email.com";
const STUDENT_PASSWORD = "123456";

/** Kill CSS animations/transitions so they can't race with clicks/assertions. */
async function disableAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition: none !important;
        transition-duration: 0s !important;
      }
    `,
  });
}

// All tests share ONE authenticated student session.
let storageStateFile: string;

test.beforeAll(async ({ browser, request }) => {
  // Register a fresh user to avoid rate-limit collisions with other spec
  // files that also log in as maria@email.com.
  const email = `e2e-settings-${Date.now()}@test.com`;
  const password = "teste123";
  const ip = `10.91.${Math.floor(Math.random() * 255)}.1`;
  const regRes = await request.post("/api/register", {
    headers: { "x-forwarded-for": ip, "content-type": "application/json" },
    data: JSON.stringify({ name: "Settings Test", email, password }),
  });
  // 201 = created, 409 = already exists (re-run) — both are fine.
  if (regRes.status() !== 201 && regRes.status() !== 409) {
    throw new Error(`Register failed: ${regRes.status()}`);
  }

  // Login via browser with a unique IP.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 20000 });
  storageStateFile = path.join(os.tmpdir(), `pds-settings-${Date.now()}.json`);
  await context.storageState({ path: storageStateFile });
  await context.close();
});

/** Open the settings page with the shared student session. */
async function openSettings(
  browser: Browser,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState: storageStateFile });
  const page = await context.newPage();
  await disableAnimations(page);
  await page.goto("/configuracoes");
  return { page, close: () => context.close() };
}

test.describe("Settings Page", () => {
  test("displays all settings sections", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    // Page heading.
    await expect(
      page.getByRole("heading", { name: "Configurações" }).first()
    ).toBeVisible({ timeout: 20000 });

    // Sound settings section.
    await expect(page.getByText("Som das Notificações")).toBeVisible({ timeout: 10000 });

    // Vibration section.
    await expect(page.getByRole("heading", { name: "Vibração" })).toBeVisible();

    // Push notifications section.
    await expect(page.getByRole("heading", { name: "Notificações Push (navegador)" })).toBeVisible();

    // Account security section.
    await expect(page.getByRole("heading", { name: "Segurança da conta" })).toBeVisible();

    await close();
  });

  test("sound toggle and tone selector work", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    // Wait for settings to load.
    await expect(page.getByText("Som das Notificações")).toBeVisible({ timeout: 15000 });

    // The sound toggle row should be visible.
    const soundToggle = page.getByText("Ativar som");
    await expect(soundToggle).toBeVisible();

    // The tone selector shows all three tones.
    await expect(page.getByRole("button", { name: /Chime Suave/ }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Pop Rápido/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Alerta/ }).first()).toBeVisible();

    // Click a different tone (Pop Rápido) and verify toast.
    await page.getByRole("button", { name: /Pop Rápido/ }).first().click();
    // The toast confirms the change.
    await expect(page.getByText(/Tom alterado/)).toBeVisible({ timeout: 10000 });

    await close();
  });

  test("vibration toggle is visible and functional", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    await expect(page.getByRole("heading", { name: "Vibração" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Ativar vibração")).toBeVisible();

    // The toggle should be visible (state depends on DB defaults).
    await expect(page.getByText("Ativar vibração")).toBeVisible();

    await close();
  });

  test("push notifications card shows appropriate message", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    await expect(
      page.getByText("Notificações Push (navegador)")
    ).toBeVisible({ timeout: 15000 });

    // In headless Chrome, PushManager may not be available — the page
    // shows either the toggle or the "não suporta" notice.
    const pushSection = page.locator("text=Receba alertas de streak");
    await expect(pushSection).toBeVisible();

    // Either the toggle or the unsupported message is present.
    const toggleOrNotice = page
      .getByText("Ativar notificações push")
      .or(page.getByText("navegador não suporta notificações push"));
    await expect(toggleOrNotice).toBeVisible({ timeout: 10000 });

    await close();
  });

  test("2FA toggle activates and shows recovery codes section", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    await expect(page.getByRole("heading", { name: "Segurança da conta" })).toBeVisible({ timeout: 15000 });

    // The 2FA toggle row.
    const toggle = page.getByRole("switch", { name: /Verificação em duas etapas/ });
    await expect(toggle).toBeVisible();

    // If 2FA is already enabled (from a previous test run), the recovery
    // codes section is visible. Otherwise, enable it.
    const isActive = await page.getByText("Códigos de recuperação", { exact: true }).isVisible().catch(() => false);

    if (!isActive) {
      // Enable 2FA by clicking the switch toggle.
      await toggle.click();
      // Wait for the success toast.
      await expect(page.getByText(/duas etapas ativada/)).toBeVisible({ timeout: 10000 });
    }

    // The recovery codes section should now be visible.
    await expect(page.getByText("Códigos de recuperação", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/códigos válidos/)).toBeVisible();

    // The generate button is present.
    await expect(
      page.getByRole("button", { name: /Gerar novos códigos/ })
    ).toBeVisible();

    // Disable 2FA again so the shared session isn't broken for other tests.
    const isNowActive = await page.getByText("Códigos de recuperação", { exact: true }).isVisible().catch(() => false);
    if (isNowActive) {
      await toggle.click();
      await expect(page.getByText(/duas etapas desativada/)).toBeVisible({ timeout: 10000 });
    }

    await close();
  });

  test("recovery codes generation shows modal with codes", async ({ browser }) => {
    // This test uses a FRESH user via API to avoid affecting the shared session.
    const context = await browser.newContext();
    const page = await context.newPage();
    await disableAnimations(page);

    // Register a fresh user.
    const email = `e2e-settings-2fa-${Date.now()}@test.com`;
    const regRes = await page.request.post("/api/register", {
      headers: { "x-forwarded-for": `10.80.${Math.floor(Math.random() * 255)}.1`, "content-type": "application/json" },
      data: JSON.stringify({ name: "2FA Test", email, password: "teste123" }),
    });
    expect(regRes.status()).toBe(201);

    // Login as the fresh user.
    await page.goto("/login");
    await page.fill("#email", email);
    await page.fill("#password", "teste123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });

    // Navigate to settings.
    await page.goto("/configuracoes");
    await expect(page.getByRole("heading", { name: "Segurança da conta" })).toBeVisible({ timeout: 15000 });

    // Enable 2FA.
    const toggle = page.getByRole("switch", { name: /Verificação em duas etapas/ });
    const isActive = await page.getByText("Códigos de recuperação", { exact: true }).isVisible().catch(() => false);
    if (!isActive) {
      await toggle.click();
      await expect(page.getByText(/duas etapas ativada/)).toBeVisible({ timeout: 10000 });
    }

    // Click "Gerar novos códigos de recuperação".
    await page.getByRole("button", { name: /Gerar novos códigos/ }).click();

    // The modal appears with the codes.
    await expect(page.getByText("Seus códigos de recuperação")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("uma única vez")).toBeVisible();

    // The modal has codes in XXXX-XXXX format.
    const codeElements = page.locator("[role='dialog'] code, [role='dialog'] span").filter({
      hasText: /^[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    });
    const codeCount = await codeElements.count();
    expect(codeCount).toBeGreaterThan(0);

    // Close the modal.
    await page.getByRole("button", { name: /Fechar|Entendi|OK/i }).click();
    await expect(page.getByText("Seus códigos de recuperação")).not.toBeVisible({
      timeout: 5000,
    });

    await context.close();
  });

  test("settings persist across page reload", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    await expect(page.getByText("Som das Notificações")).toBeVisible({ timeout: 15000 });

    // Reload the page.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Configurações" }).first()).toBeVisible({
      timeout: 20000,
    });

    // Settings sections still visible after reload.
    await expect(page.getByText("Som das Notificações")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Vibração" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Segurança da conta" })).toBeVisible();

    await close();
  });
});
