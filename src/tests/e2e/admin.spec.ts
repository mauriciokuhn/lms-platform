import { test, expect, type Browser, type Page } from "@playwright/test";
import path from "path";
import os from "os";
import { PrismaClient } from "@prisma/client";

// One worker for this file so the beforeAll login runs once: the login
// endpoint is rate-limited (10/min per IP) and the suite already performs
// several logins (login/roles specs plus this file's auth tests).
test.describe.configure({ mode: "serial" });

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

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("#email", "admin@lms.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("/admin", { timeout: 20000 });
}

// The functional tests share ONE authenticated session (storage state from
// the beforeAll login) so the whole suite stays under the login rate limit.
let storageStateFile: string;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAsAdmin(page);
  storageStateFile = path.join(os.tmpdir(), `pds-admin-${Date.now()}.json`);
  await context.storageState({ path: storageStateFile });
  await context.close();
});

/** Open a page with the shared admin session and the animations disabled. */
async function openAdmin(
  browser: Browser,
  url: string
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState: storageStateFile });
  const page = await context.newPage();
  await disableAnimations(page);
  await gotoWithRetry(page, url);
  return { page, close: () => context.close() };
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

  test("dashboard shows metrics, sections and the instructor table", async ({ browser }) => {
    const { page, close } = await openAdmin(browser, "/admin");

    await expect(
      page.getByRole("heading", { name: "Dashboard Administrativo" })
    ).toBeVisible({ timeout: 20000 });

    // Metrics render after /api/admin/metrics resolves — wait for a section
    // heading first so the cards are on screen before asserting labels.
    await expect(page.getByText("Matrículas Recentes")).toBeVisible({ timeout: 20000 });

    // Metric card labels (values depend on DB state — assert labels only).
    for (const label of ["Total de Alunos", "Matrículas", "Certificados"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 10000 });
    }

    // Dashboard sections (the instructor heading carries an emoji prefix,
    // so match it as a substring rather than exact text).
    for (const section of ["Alunos Recentes", "Instrutores Ativos", "Ações Rápidas"]) {
      await expect(page.getByText(section)).toBeVisible({ timeout: 10000 });
    }

    // The daily security summary card renders (numbers depend on DB state).
    await expect(page.getByText("Resumo de Segurança de Hoje")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Logins registrados")).toBeVisible({ timeout: 10000 });

    // Seeded instructor shows in the "Instrutores Ativos" table.
    await expect(page.getByRole("link", { name: "Lucas Mendes" })).toBeVisible({ timeout: 10000 });

    // Quick actions (the card links wrap a title + description, so the
    // accessible name is longer than the heading text — match a substring).
    await expect(page.getByRole("link", { name: /Novo Curso/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Gerenciar Cursos/ })).toBeVisible();

    await close();
  });

  test("course management lists seeded courses, badges and tabs", async ({ browser }) => {
    const { page, close } = await openAdmin(browser, "/admin/cursos");

    await expect(
      page.getByRole("heading", { name: "Cursos", level: 1 }).first()
    ).toBeVisible({ timeout: 20000 });

    // Seeded course titles render in the table.
    for (const title of [
      "Introdução ao JavaScript",
      "React do Zero ao Avançado",
      "Banco de Dados SQL",
    ]) {
      await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 });
    }

    // Published courses carry a green badge.
    await expect(page.getByText("Publicado", { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Pendentes tab: either pending rows or the empty state, depending on DB.
    await page.getByRole("button", { name: /⏳ Pendentes/ }).click();
    await expect(
      page
        .getByText("Pendente", { exact: true })
        .or(page.getByText("Nenhum curso aguardando aprovação"))
    ).toBeVisible({ timeout: 10000 });

    // Back to Todos — the table still lists courses.
    await page.getByRole("button", { name: /Todos \(/ }).click();
    await expect(page.getByText("Introdução ao JavaScript", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // "Editar" on a SEEDED course row opens the course editor. (The first
    // row is a course the parallel create/delete test is mutating, so anchor
    // on a stable seeded title instead.)
    const seededRow = page.getByRole("row", { name: "Introdução ao JavaScript" });
    await seededRow.getByRole("link", { name: "Editar" }).click();
    await page.waitForURL(/\/admin\/cursos\/[^/]+\/editar/, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Editar Curso" })).toBeVisible({
      timeout: 20000,
    });

    await close();
  });

  test("students page lists the seeded students", async ({ browser }) => {
    const { page, close } = await openAdmin(browser, "/admin/alunos");

    await expect(
      page.getByRole("heading", { name: "Alunos", level: 1 }).first()
    ).toBeVisible({ timeout: 20000 });

    for (const name of ["Maria Silva", "João Santos", "Ana Oliveira"]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    }

    await close();
  });

  test("analytics renders summary cards, charts and range switching", async ({ browser }) => {
    const { page, close } = await openAdmin(browser, "/admin/analytics");

    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible({
      timeout: 20000,
    });

    // Summary cards (rendered after /api/admin/analytics resolves).
    await expect(page.getByText("Total Matrículas")).toBeVisible({ timeout: 20000 });
    for (const label of ["Taxa de Conclusão", "Alunos Ativos"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 10000 });
    }

    // Chart sections.
    await expect(page.getByText("Matrículas por Mês")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Cursos Mais Populares")).toBeVisible({ timeout: 10000 });

    // Range buttons switch (the active one gets the dark background; the
    // inactive ones carry a dark:bg-zinc-900 variant, so match the exact
    // unprefixed class to tell them apart).
    const activeClass = /(?<!:)bg-zinc-900/;
    const sevenDays = page.getByRole("button", { name: "7 dias" });
    const thirtyDays = page.getByRole("button", { name: "30 dias" });
    const ninetyDays = page.getByRole("button", { name: "90 dias" });

    // 30 dias is the default range.
    await expect(thirtyDays).toHaveClass(activeClass);
    await expect(sevenDays).not.toHaveClass(activeClass);

    await sevenDays.click();
    await expect(sevenDays).toHaveClass(activeClass);
    await expect(thirtyDays).not.toHaveClass(activeClass);

    await ninetyDays.click();
    await expect(ninetyDays).toHaveClass(activeClass);
    await expect(sevenDays).not.toHaveClass(activeClass);

    // CSV export control is present.
    await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeVisible();

    await close();
  });

  test("admin ends a student's remote session from the alunos page", async ({ browser }) => {
    // Seed a student with one recorded login session directly in the DB.
    const prisma = new PrismaClient();
    const student = await prisma.user.create({
      data: {
        name: `Aluno Revoga ${Date.now()}`,
        email: `e2e-admin-revoke-${Date.now()}@test.com`,
        passwordHash: "not-used",
        role: "STUDENT",
      },
    });
    const record = await prisma.loginHistory.create({
      data: {
        userId: student.id,
        ipHash: "e2e-admin-ip",
        userAgent: "Chrome/120.0 Windows NT 10.0",
        sessionTokenHash: "tok-e2e-admin-revoke",
      },
    });
    await prisma.$disconnect();

    const { page, close } = await openAdmin(browser, "/admin/alunos");
    const row = page.getByRole("row", { name: student.name ?? student.email });
    await expect(row).toBeVisible({ timeout: 20000 });

    // Expand the student's sessions and end the seeded one.
    await row.getByRole("button", { name: "Ver" }).click();
    await expect(page.getByText("Chrome · Windows")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Encerrar" }).click();
    await expect(page.getByText("Encerrada", { exact: true })).toBeVisible({ timeout: 10000 });
    await close();

    // The record is marked revoked in the DB — the proxy rejects that token.
    const check = new PrismaClient();
    const updated = await check.loginHistory.findUnique({ where: { id: record.id } });
    expect(updated?.revokedAt).toBeTruthy();
    await check.$disconnect();
  });

  test("creates a course and deletes it again (full CRUD cycle)", async ({ browser }) => {
    const { page, close } = await openAdmin(browser, "/admin/cursos/novo");

    await expect(page.getByRole("heading", { name: "Novo Curso" })).toBeVisible({
      timeout: 20000,
    });

    const title = `E2E Admin ${Date.now()}`;
    await page.fill("#title", title);
    await page.selectOption("#category", "Programação");
    await page.fill("#description", "Curso criado e excluído pelo teste e2e do painel administrativo.");

    await page.getByRole("button", { name: "Criar Curso" }).click();

    // Lands on the editor for the new course.
    await page.waitForURL(/\/admin\/cursos\/[^/]+\/editar/, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Editar Curso" })).toBeVisible({
      timeout: 20000,
    });

    // The new course shows up in the management table as a draft.
    await gotoWithRetry(page, "/admin/cursos");
    const row = page.getByRole("row", { name: title });
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row.getByText("Rascunho", { exact: true })).toBeVisible({ timeout: 10000 });

    // Delete it (the page confirms with a native dialog).
    page.once("dialog", (dialog) => void dialog.accept());
    await row.getByRole("button", { name: "Excluir" }).click();

    await expect(page.getByText("Curso excluído com sucesso!")).toBeVisible({ timeout: 10000 });
    await expect(row).toHaveCount(0, { timeout: 10000 });

    await close();
  });
});

test.describe("Admin Panel (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile drawer opens, navigates and closes", async ({ browser }) => {
    const { page, close } = await openAdmin(browser, "/admin");

    await expect(
      page.getByRole("heading", { name: "Dashboard Administrativo" })
    ).toBeVisible({ timeout: 20000 });

    // The desktop sidebar is hidden below the lg breakpoint; the drawer is
    // the second <nav> in the DOM (it renders after the aside).
    const drawerNav = page.locator("nav").last();
    const hamburger = page.getByRole("button", { name: "Abrir menu" });
    await expect(hamburger).toBeVisible();

    // Open the drawer — the backdrop overlay appears with the nav links.
    await hamburger.click();
    await expect(page.locator("div.fixed.inset-0.z-40")).toBeVisible({ timeout: 10000 });
    await expect(drawerNav.getByRole("link", { name: "Alunos" })).toBeVisible({
      timeout: 10000,
    });

    // Navigate through the drawer; it closes itself on route change.
    await drawerNav.getByRole("link", { name: "Alunos" }).click();
    await page.waitForURL(/\/admin\/alunos/, { timeout: 20000 });
    await expect(
      page.getByRole("heading", { name: "Alunos", level: 1 }).first()
    ).toBeVisible({ timeout: 20000 });
    await expect(page.locator("div.fixed.inset-0.z-40")).toHaveCount(0, { timeout: 10000 });

    // Reopen and close via the drawer's close button.
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.locator("div.fixed.inset-0.z-40")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Fechar menu" }).click();
    await expect(page.locator("div.fixed.inset-0.z-40")).toHaveCount(0, { timeout: 10000 });

    await close();
  });
});
