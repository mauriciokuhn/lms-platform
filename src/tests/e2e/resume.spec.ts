import { test, expect, type Page } from "@playwright/test";
import { registerUser } from "./register";

/**
 * Lesson resume behavior:
 *
 *   - The lesson page persists the last visited lesson in localStorage
 *     (pds-last-lesson-{courseId}) — "Continuar Estudos" on the course page
 *     must point to that lesson, not always the first one.
 *   - With no visit history, the CTA falls back to the first lesson.
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

test.describe("Lesson resume", () => {
  test("Continuar Estudos points to the last visited lesson", async ({ page }) => {
    await disableAnimations(page);
    await register(page);
    await openCourseAndEnroll(page);

    // Resolve the course lesson ids through the public course API.
    const courseId = page.url().split("/").pop();
    const course = await page.evaluate(async (id) => {
      const res = await fetch(`/api/courses/${id}`);
      if (!res.ok) throw new Error(`Course API responded ${res.status}`);
      return res.json();
    }, courseId);
    const firstLessonId = course.modules?.[0]?.lessons?.[0]?.id;
    const secondLessonId = course.modules?.[0]?.lessons?.[1]?.id;
    expect(firstLessonId).toBeTruthy();
    expect(secondLessonId).toBeTruthy();

    // Visit the SECOND lesson — the page persists it as the last visited.
    await page.goto(`/cursos/${courseId}/aulas/${secondLessonId}`);
    await expect(page.getByRole("button", { name: /Marcar como Concluída/i })).toBeVisible({
      timeout: 20000,
    });
    await expect
      .poll(async () =>
        page.evaluate(
          (cid) => window.localStorage.getItem(`pds-last-lesson-${cid}`),
          courseId
        )
      )
      .toBe(secondLessonId);

    // Back on the course page, the main CTA must point to the second lesson.
    await page.goto(`/cursos/${courseId}`);
    const cta = page.getByRole("link", { name: /Continuar Estudos/i });
    await expect(cta).toBeVisible({ timeout: 20000 });
    await expect(cta).toHaveAttribute("href", `/cursos/${courseId}/aulas/${secondLessonId}`);

    // The "última aula não concluída" shortcut is a different target (first
    // uncompleted lesson) and therefore also visible.
    await expect(page.getByRole("link", { name: /última aula não concluída/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /última aula não concluída/i })).toHaveAttribute(
      "href",
      `/cursos/${courseId}/aulas/${firstLessonId}`
    );
  });

  test("fresh enrollment falls back to the first lesson", async ({ page }) => {
    await disableAnimations(page);
    await register(page);
    await openCourseAndEnroll(page);

    const courseId = page.url().split("/").pop();
    const course = await page.evaluate(async (id) => {
      const res = await fetch(`/api/courses/${id}`);
      if (!res.ok) throw new Error(`Course API responded ${res.status}`);
      return res.json();
    }, courseId);
    const firstLessonId = course.modules?.[0]?.lessons?.[0]?.id;
    expect(firstLessonId).toBeTruthy();

    // No lesson visited → the CTA is "Começar Curso" and points to lesson 1.
    const cta = page.getByRole("link", { name: /Começar Curso/i });
    await expect(cta).toBeVisible({ timeout: 20000 });
    await expect(cta).toHaveAttribute("href", `/cursos/${courseId}/aulas/${firstLessonId}`);
  });
});
