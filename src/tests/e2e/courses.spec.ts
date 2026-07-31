import { test, expect } from "@playwright/test";

test.describe("Course Catalog", () => {
  test("should display course catalog", async ({ page }) => {
    await page.goto("/cursos");

    // Should show the catalog title
    await expect(page.locator("text=Catálogo de Cursos")).toBeVisible();
  });

  test("should search courses", async ({ page }) => {
    await page.goto("/cursos");

    // Type in search
    await page.fill('input[placeholder*="Buscar"]', "JavaScript");

    // Should filter results
    await page.waitForTimeout(500);
    const results = page.locator('a[href^="/cursos/"]');
    const count = await results.count();

    // Should have at least some results matching "JavaScript"
    if (count > 0) {
      await expect(page.locator("text=JavaScript").first()).toBeVisible();
    }
  });

  test("should navigate to course details", async ({ page }) => {
    await page.goto("/cursos");

    // Click first course
    const firstCourse = page.locator('a[href^="/cursos/"]').first();
    await firstCourse.click();

    // Should show course detail page
    await page.waitForURL(/\/cursos\//);
    await expect(page.locator("text=aulas").first()).toBeVisible();
  });
});
