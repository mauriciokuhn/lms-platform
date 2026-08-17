import { test, expect, type Page } from "@playwright/test";
import { registerUser } from "./register";

/**
 * Full student journey: register → enroll → watch lessons → pass quiz → get certificate.
 *
 * Runs against the real dev server (baseURL http://localhost:3000). A fresh
 * user is registered per run (unique email) so the flow is deterministic and
 * does not depend on seed state.
 *
 * Flakiness guards:
 *  - Animations/transitions are disabled at the start of the test so the
 *    celebration modal and card entrance animations cannot intercept clicks
 *    or cause auto-waits to time out.
 *  - Assertions use expect.poll / toBeVisible with generous timeouts instead
 *    of fixed waits.
 *  - The playwright config adds retries + action timeouts (see config).
 */

const COURSE_TITLE = "UI/UX Design Completo";

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

async function register(page: Page) {
  await registerUser(page);
}

async function openCourseAndEnroll(page: Page) {
  await page.goto("/cursos");
  await page.getByText(COURSE_TITLE, { exact: true }).first().click();
  await page.waitForURL(/\/cursos\/[^/]+$/);
  await page.getByRole("button", { name: /Matricular-se/i }).click();
  await expect(page.getByRole("link", { name: /Começar Curso|Continuar Estudos/i })).toBeVisible({
    timeout: 15000,
  });
  // Wait for the success toast to disappear so it can't intercept the next click.
  await expect(page.getByText("Matrícula realizada!")).toBeHidden({ timeout: 10000 });
}

/** Click "Marcar como Concluída" and wait for the green "Concluída" state. */
async function completeCurrentLesson(page: Page): Promise<string> {
  const lessonUrl = page.url();
  await page.getByRole("button", { name: /Marcar como Concluída/i }).click();
  await expect(page.getByRole("button", { name: /^Concluída/ })).toBeVisible({ timeout: 15000 });
  return lessonUrl;
}

/** Wait until the URL changes (auto-navigation to the next lesson). */
async function waitForLessonChange(page: Page, previousUrl: string) {
  await page.waitForFunction(
    (prev) => window.location.href !== prev,
    previousUrl,
    { timeout: 20000 }
  );
  await expect(page.getByRole("button", { name: /Marcar como Concluída/i })).toBeVisible({
    timeout: 15000,
  });
}

async function passQuiz(page: Page) {
  // Grab the quiz link from the course page
  const quizLink = page.locator('a[href*="/quiz/"]').first();
  await expect(quizLink).toBeVisible();
  const quizUrl = await quizLink.getAttribute("href");
  expect(quizUrl).toBeTruthy();

  await page.goto(quizUrl!);
  await page.waitForURL(/\/quiz\//);

  // Fetch the quiz through the API (same session) to learn the correct
  // options. quizUrl is the PAGE path (/cursos/{id}/quiz/{quizId}) — the
  // JSON data lives at the API path (/api/courses/{id}/quizzes/{quizId}).
  const [courseId, quizId] = quizUrl!.split("/").filter(Boolean).slice(-2);
  const apiUrl = `/api/courses/${courseId}/quizzes/${quizId}`;
  const quiz = await page.evaluate(async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Quiz API responded ${res.status}`);
    return res.json();
  }, apiUrl);

  expect(quiz.questions.length).toBeGreaterThan(0);

  for (const question of quiz.questions) {
    const correct = question.options.find((o: { isCorrect: boolean }) => o.isCorrect);
    expect(correct, `Questão sem opção correta: ${question.text}`).toBeTruthy();
    await page
      .getByRole("button", { name: new RegExp(escapeRegex(correct.text)) })
      .click();
  }

  await page.getByRole("button", { name: /Enviar Respostas/i }).click();

  // Passed banner (poll: the submission is async and the result panel
  // appears only after the server grades the attempt).
  await expect(page.getByText("✅ Aprovado!")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("100%")).toBeVisible();
}

test.describe("Certificate Flow", () => {
  test("register, complete a course and receive a certificate", async ({ page }) => {
    // The full journey (register → enroll → 2 lessons → quiz → certificate)
    // is long, and dev-mode on-demand compilation can stall individual steps.
    // Give the whole flow a generous budget so it never times out on cold paths.
    test.setTimeout(120_000);

    await disableAnimations(page);
    await register(page);
    await openCourseAndEnroll(page);

    // Start the first lesson (force: the CTA sits near the top of the page
    // and brief overlays may otherwise block actionability)
    await page.getByRole("link", { name: /Começar Curso|Continuar Estudos/i }).click({ force: true });
    await page.waitForURL(/\/aulas\//);

    // Lesson 1 → auto-navigates to lesson 2 after completion
    const firstLesson = await completeCurrentLesson(page);
    await waitForLessonChange(page, firstLesson);
    await completeCurrentLesson(page);

    // Back to the course page to find the quiz (progress should be 100%)
    await page.goto(new URL(page.url()).pathname.split("/aulas/")[0]);
    await expect(page.getByText("100%")).toBeVisible({ timeout: 15000 });

    await passQuiz(page);

    // The quiz result links straight to the generated certificate.
    await page.getByRole("link", { name: /Ver Certificado/i }).click();
    await page.waitForURL(/\/certificados\//);

    // Direct certificate page: the course is rendered (as text, not a
    // heading) along with the CERT- code.
    await expect(page.getByText(COURSE_TITLE)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Certificado Verificado")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/CERT-/)).toBeVisible({ timeout: 10000 });
  });
});
