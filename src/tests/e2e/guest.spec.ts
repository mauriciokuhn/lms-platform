import { test, expect, type Page } from "@playwright/test";

/**
 * Guest (unauthenticated) surface:
 *
 *   - course details render publicly (title, CTA, curriculum, locked quizzes)
 *   - clicking "Matricular-se Grátis" without a session redirects to /login
 *   - lesson URLs are reachable but show the login CTA ("Entrar para salvar progresso")
 *   - the proxy (src/proxy.ts) bounces guests off protected routes
 *   - locked quiz links show the enrollment error instead of navigating
 */

const COURSE_TITLE = "UI/UX Design Completo";

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

test.describe("Guest experience", () => {
  test("course details render publicly with the curriculum and locked quizzes", async ({
    page,
  }) => {
    await disableAnimations(page);
    await page.goto("/cursos");
    await page.getByText(COURSE_TITLE, { exact: true }).first().click();
    await page.waitForURL(/\/cursos\/[^/]+$/);

    // exact: a course quiz is titled "Avaliação Final - <title>", which also
    // matches a substring heading lookup.
    await expect(page.getByRole("heading", { name: COURSE_TITLE, exact: true })).toBeVisible({
      timeout: 20000,
    });

    // Public CTA + curriculum are visible without a session.
    await expect(page.getByRole("button", { name: /Matricular-se/i })).toBeVisible();
    await expect(page.getByText("Conteúdo do Curso", { exact: true })).toBeVisible();

    // Quizzes render but are locked for non-enrolled guests.
    await expect(page.getByText("Questionários", { exact: true })).toBeVisible();
    await expect(page.getByText("🔒")).toBeVisible();
  });

  test("clicking enroll as a guest redirects to login", async ({ page }) => {
    await disableAnimations(page);
    await page.goto("/cursos");
    await page.getByText(COURSE_TITLE, { exact: true }).first().click();
    await page.waitForURL(/\/cursos\/[^/]+$/);

    await expect(page.getByRole("heading", { name: COURSE_TITLE, exact: true })).toBeVisible({
      timeout: 20000,
    });
    await page.getByRole("button", { name: /Matricular-se/i }).click();
    await page.waitForURL("/login", { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Entrar");
  });

  test("lesson URLs are reachable but show the login CTA", async ({ page }) => {
    await disableAnimations(page);
    await page.goto("/cursos");
    await page.getByText(COURSE_TITLE, { exact: true }).first().click();
    await page.waitForURL(/\/cursos\/[^/]+$/);
    await expect(page.getByRole("heading", { name: COURSE_TITLE, exact: true })).toBeVisible({
      timeout: 20000,
    });

    // Guests can't see lesson links, so resolve the first lesson id through
    // the same public course API the page itself uses.
    const courseId = page.url().split("/").pop();
    const course = await page.evaluate(async (id) => {
      const res = await fetch(`/api/courses/${id}`);
      if (!res.ok) throw new Error(`Course API responded ${res.status}`);
      return res.json();
    }, courseId);
    const firstLessonId = course.modules?.[0]?.lessons?.[0]?.id;
    expect(firstLessonId).toBeTruthy();

    await page.goto(`/cursos/${courseId}/aulas/${firstLessonId}`);
    await expect(page.getByText("Entrar para salvar progresso")).toBeVisible({
      timeout: 20000,
    });
    // The lesson content itself stays hidden for guests.
    await expect(page.getByRole("button", { name: /Marcar como Concluída/i })).toBeHidden();
  });

  test("the proxy redirects guests away from protected routes", async ({ page }) => {
    for (const route of ["/dashboard", "/meus-cursos", "/configuracoes"]) {
      await page.goto(route);
      await page.waitForURL("/login", { timeout: 15000 });
      await expect(page.locator("h1")).toContainText("Entrar");
    }
  });

  test("locked quiz links show the enrollment error instead of navigating", async ({
    page,
  }) => {
    await disableAnimations(page);
    await page.goto("/cursos");
    await page.getByText(COURSE_TITLE, { exact: true }).first().click();
    await page.waitForURL(/\/cursos\/[^/]+$/);

    // Guests see the quiz row as a "#" link (locked 🔒), so match it by its
    // seeded title instead of the enrolled-only /quiz/ href.
    const quizLink = page.getByRole("link", { name: /Avaliação Final/ });
    await expect(quizLink).toBeVisible({ timeout: 20000 });

    await quizLink.click();
    await expect(page.getByText("Matricule-se no curso para acessar o questionário")).toBeVisible({
      timeout: 10000,
    });
    // The click is prevented — we stay on the course page.
    await expect(page).toHaveURL(/\/cursos\/[^/]+$/);
  });
});
