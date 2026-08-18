import { test, expect, type Browser, type Page } from "@playwright/test";
import path from "path";
import os from "os";

/**
 * Gamification page (/gamificacao):
 *
 *   - Progress tab (default): XP bar, streak display, badges, recent activities,
 *     and a ranking preview card.
 *   - Ranking tab: full ranking table with student names and XP values.
 *   - Social tab: social gamification section.
 *
 * Uses the seeded student maria@email.com (XP 350, level 2, streak 5).
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

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.fill("#email", STUDENT_EMAIL);
  await page.fill("#password", STUDENT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 20000 });
  storageStateFile = path.join(os.tmpdir(), `pds-gamification-${Date.now()}.json`);
  await context.storageState({ path: storageStateFile });
  await context.close();
});

/** Open the gamification page with the shared student session. */
async function openGamification(
  browser: Browser,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState: storageStateFile });
  const page = await context.newPage();
  await disableAnimations(page);
  await page.goto("/gamificacao");
  return { page, close: () => context.close() };
}

test.describe("Gamification Page", () => {
  test("progress tab shows XP bar, streak, badges and recent activities", async ({
    browser,
  }) => {
    const { page, close } = await openGamification(browser);

    // Page heading.
    await expect(page.getByRole("heading", { name: "Gamificação" })).toBeVisible({
      timeout: 20000,
    });

    // Progress tab is active by default.
    const progressTab = page.getByRole("button", { name: "Meu Progresso" });
    await expect(progressTab).toBeVisible();

    // XP bar: level badge + XP total + level progress text.
    await expect(page.getByText("Nível 2", { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("XP total")).toBeVisible();
    await expect(page.getByText("350", { exact: true }).first()).toBeVisible();

    // Streak display: current streak + "dias de streak".
    await expect(page.getByText("dias de streak")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Recorde")).toBeVisible();

    // Seeded achievements (from prisma/seed.ts) show in recent activities.
    await expect(page.getByText("Atividades Recentes")).toBeVisible({ timeout: 10000 });

    // The "Primeira Aula" badge was created by the seed.
    await expect(page.getByText("Badge: Primeira Aula!")).toBeVisible({ timeout: 10000 });

    // Ranking preview card (from gamification progress tab).
    await expect(page.getByText("Sua posição no ranking")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Ver ranking completo")).toBeVisible();

    await close();
  });

  test("ranking tab shows the ranking table", async ({ browser }) => {
    const { page, close } = await openGamification(browser);

    // Switch to ranking tab.
    await page.getByRole("button", { name: "Ranking" }).click();

    // Ranking heading and student count.
    await expect(page.getByText("Ranking de Alunos")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/\d+ alunos/)).toBeVisible();

    // The seeded students appear in the ranking.
    await expect(page.getByText("Maria Silva")).toBeVisible({ timeout: 10000 });

    await close();
  });

  test("social tab shows the social section", async ({ browser }) => {
    const { page, close } = await openGamification(browser);

    // Switch to social tab.
    await page.getByRole("button", { name: "Social" }).click();

    // Social section heading and description.
    await expect(page.getByText("Gamificação Social")).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText("Participe de desafios semanais")
    ).toBeVisible();

    await close();
  });

  test("navigating from dashboard header gamification link works", async ({
    browser,
  }) => {
    const { page, close } = await openGamification(browser);

    // First go to dashboard to test the header link.
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Ol[aá],/i }).first()).toBeVisible({
      timeout: 20000,
    });

    // Click the gamification link in the header (🏆 icon).
    await page.getByRole("link", { name: /Gamificação/ }).click();
    await page.waitForURL("/gamificacao", { timeout: 15000 });

    // The gamification page heading is visible.
    await expect(page.getByRole("heading", { name: "Gamificação" })).toBeVisible({
      timeout: 15000,
    });

    await close();
  });
});
