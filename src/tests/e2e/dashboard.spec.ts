import { test, expect, type Browser, type Page } from "@playwright/test";
import path from "path";
import os from "os";

// One worker for this file so the beforeAll login runs once: the login
// endpoint is rate-limited (10/min per IP) and the suite already performs
// several logins (login/roles specs plus admin's auth tests).
test.describe.configure({ mode: "serial" });

/**
 * Student dashboard flow (maria@email.com is the seeded student with 4
 * ACTIVE enrollments, XP 350 / level 2, streak 5, 2 notifications):
 *
 *   - greeting + stats cards (Cursos Ativos, Concluídos, Aulas, Certificados)
 *   - configurable daily goal (persisted per device via localStorage)
 *   - weekly XP evolution chart + personal pace
 *   - gamification summary (XP bar + streak display)
 *   - notification bell with the seeded demo notifications
 *   - header navigation (Configurações / Meus Cursos / Certificados)
 *
 * Robustness guards:
 *  - Animations are disabled up front (framer-motion bars, confetti and the
 *    bell badge can otherwise intercept clicks or delay auto-waits).
 *  - Assertions use toBeVisible with generous timeouts instead of fixed
 *    waits (dev-mode on-demand compilation is slow on first hit).
 *  - Exact unread counts are NOT asserted: the dashboard fires idempotent
 *    weekly/monthly summary POSTs on mount, which may add notifications.
 */

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

// All tests share ONE authenticated student session (storage state from the
// beforeAll login) so the suite stays under the login rate limit.
let storageStateFile: string;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.fill("#email", STUDENT_EMAIL);
  await page.fill("#password", STUDENT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 20000 });
  storageStateFile = path.join(os.tmpdir(), `pds-dashboard-${Date.now()}.json`);
  await context.storageState({ path: storageStateFile });
  await context.close();
});

/** Open the dashboard with the shared student session and animations off. */
async function openStudent(
  browser: Browser,
  url = "/dashboard"
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState: storageStateFile });
  const page = await context.newPage();
  await disableAnimations(page);
  await page.goto(url);
  return { page, close: () => context.close() };
}

test.describe("Student Dashboard", () => {
  test("shows the greeting and course statistics", async ({ browser }) => {
    const { page, close } = await openStudent(browser);

    await expect(page.getByRole("heading", { name: /Ol[aá], Maria/i })).toBeVisible({
      timeout: 20000,
    });

    const main = page.locator("main");
    const stats = {
      "Cursos Ativos": "4",
      "Concluídos": "0",
      "Aulas Completas": "0",
      "Certificados": "0",
    };
    for (const [label, value] of Object.entries(stats)) {
      const card = main.getByText(label, { exact: true }).locator("..");
      await expect(card).toContainText(value, { timeout: 15000 });
    }

    await close();
  });

  test("daily goal defaults to 3 and persists a change per device", async ({ browser }) => {
    const { page, close } = await openStudent(browser);

    const main = page.locator("main");
    await expect(main.getByText("Meta Diária")).toBeVisible({ timeout: 20000 });
    // Seeded student has no lesson completed today → 0 de 3 (default goal).
    await expect(main.getByText(/0 de 3 aulas hoje/)).toBeVisible();

    await page.getByRole("button", { name: "Aumentar meta diária" }).click();
    await expect(main.getByText(/0 de 4 aulas hoje/)).toBeVisible({ timeout: 10000 });

    // Reload: the goal is persisted in localStorage for this device.
    await page.reload();
    await expect(main.getByText(/0 de 4 aulas hoje/)).toBeVisible({ timeout: 20000 });

    await close();
  });

  test("renders weekly XP evolution and the gamification summary", async ({ browser }) => {
    const { page, close } = await openStudent(browser);

    const main = page.locator("main");
    // Weekly XP section — the seeded student has no lesson completions in the
    // last 7 days, so the chart renders with +0 XP. The comparison block also
    // renders once other users have activity, so scope to the exact span.
    await expect(main.getByText("Evolução de XP")).toBeVisible({ timeout: 20000 });
    await expect(main.getByText("+0 XP", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(main.getByText(/nos últimos 7 dias/)).toBeVisible();

    // Gamification summary: XP bar (level 2 / 350 XP) + streak display.
    await expect(main.getByText("Nível 2", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(main.getByText("350", { exact: true })).toBeVisible();
    await expect(main.getByText("XP total")).toBeVisible();
    await expect(main.getByText("dias de streak")).toBeVisible();

    await close();
  });

  test("notification bell opens with the seeded notifications", async ({ browser }) => {
    const { page, close } = await openStudent(browser);

    const bell = page.getByRole("button", { name: "Notificações" });
    await expect(bell).toBeVisible({ timeout: 20000 });
    await bell.click();

    // Dropdown lists the seeded demo notifications (title from prisma/seed.ts).
    await expect(page.getByText("Matrícula confirmada! 📚")).toBeVisible({ timeout: 15000 });

    await close();
  });

  test("header links navigate to courses, certificates and settings", async ({ browser }) => {
    const { page, close } = await openStudent(browser);

    // A summary-notification toast can briefly overlay the header after mount
    // and intercept the click — wait for any toast to clear before acting.
    await page.locator("[data-sonner-toast]").first().waitFor({ state: "hidden", timeout: 15000 });

    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Meus Cursos" })).toBeVisible({ timeout: 20000 });
    await expect(header.getByRole("link", { name: "Certificados" })).toBeVisible();
    await expect(header.getByRole("link", { name: /Configurações/ })).toBeVisible();

    await header.getByRole("link", { name: /Configurações/ }).click();
    await page.waitForURL("/configuracoes", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Configurações" }).first()
    ).toBeVisible({ timeout: 20000 });

    await close();
  });
});
