import { test, expect, type Browser, type Page } from "@playwright/test";
import path from "path";
import os from "os";

// One worker for this file so the beforeAll login runs once: the login
// endpoint is rate-limited (10/min per IP) and the suite already performs
// several logins (login/roles specs plus admin's auth tests).
test.describe.configure({ mode: "serial" });

/**
 * Instructor panel flow (lucas@lms.com is the seeded instructor who owns the
 * Programação / Front-end / Back-end courses):
 *
 *   - dashboard with metrics + course table (seeded course titles)
 *   - Meus Cursos list
 *   - course creation flow (form → POST /api/instructor/courses → editor)
 *
 * Robustness guards:
 *  - Animations are disabled up front.
 *  - Metric VALUES are not asserted (parallel runs / prior runs can add
 *    courses and enrollments); seeded course TITLES are the stable anchor.
 *  - The created course uses a unique title so reruns never collide.
 */

const INSTRUCTOR_EMAIL = "lucas@lms.com";
const INSTRUCTOR_PASSWORD = "instrutor123";

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

// All tests share ONE authenticated instructor session (storage state from
// the beforeAll login) so the suite stays under the login rate limit.
let storageStateFile: string;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.fill("#email", INSTRUCTOR_EMAIL);
  await page.fill("#password", INSTRUCTOR_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/instrutor", { timeout: 20000 });
  storageStateFile = path.join(os.tmpdir(), `pds-instructor-${Date.now()}.json`);
  await context.storageState({ path: storageStateFile });
  await context.close();
});

/** Open a page with the shared instructor session and the animations off. */
async function openInstructor(
  browser: Browser,
  url = "/instrutor"
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState: storageStateFile });
  const page = await context.newPage();
  await disableAnimations(page);
  await page.goto(url);
  return { page, close: () => context.close() };
}

test.describe("Instructor Panel", () => {
  test("shows the dashboard with metrics and the course table", async ({ browser }) => {
    const { page, close } = await openInstructor(browser);

    await expect(page.getByRole("heading", { name: "Dashboard do Instrutor" })).toBeVisible({
      timeout: 20000,
    });

    // Metric cards (labels only — values depend on DB state). "Alunos" and
    // "Avaliação Média" also appear as table headers, hence .first().
    for (const label of ["Cursos", "Alunos", "Taxa de Conclusão", "Avaliação Média"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 10000 });
    }

    // Course table lists the seeded courses owned by lucas.
    for (const title of [
      "Introdução ao JavaScript",
      "React do Zero ao Avançado",
      "Node.js API RESTful",
    ]) {
      await expect(page.getByRole("link", { name: title })).toBeVisible({ timeout: 10000 });
    }

    // Pending-approval alert area + actions render (there are two "Novo
    // Curso" links — one per section — so use exact matching).
    await expect(page.getByRole("link", { name: "Novo Curso", exact: true })).toBeVisible();

    await close();
  });

  test("Meus Cursos lists the instructor's courses", async ({ browser }) => {
    const { page, close } = await openInstructor(browser);

    await page.getByRole("link", { name: "Meus Cursos" }).click();
    await page.waitForURL("/instrutor/cursos", { timeout: 15000 });

    await expect(page.getByRole("heading", { name: "Meus Cursos" })).toBeVisible({
      timeout: 20000,
    });

    for (const title of [
      "Introdução ao JavaScript",
      "React do Zero ao Avançado",
      "Node.js API RESTful",
    ]) {
      await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 });
    }

    await expect(page.getByRole("link", { name: "+ Novo Curso" })).toBeVisible();

    await close();
  });

  test("creates a new course and lands on the editor", async ({ browser }) => {
    const { page, close } = await openInstructor(browser, "/instrutor/cursos/novo");

    await expect(page.getByRole("heading", { name: "Novo Curso" })).toBeVisible({
      timeout: 20000,
    });

    const title = `E2E Curso ${Date.now()}`;
    await page.fill("#title", title);
    await page.selectOption("#category", "Programação");
    await page.fill("#description", "Curso criado pelo teste e2e do painel do instrutor.");

    await page.getByRole("button", { name: "Criar Curso" }).click();

    // Redirects to the editor for the new course.
    await page.waitForURL(/\/instrutor\/cursos\/[^/]+\/editar/, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 20000 });

    await close();
  });
});
