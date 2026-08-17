import { test, expect, type Page } from "@playwright/test";
import path from "path";
import os from "os";
import { registerUser } from "./register";

/**
 * Student checkout flows:
 *
 *   1. Enrolling in a free course through the course page — the real path
 *      for all seeded courses (every seeded course is `price: 0`).
 *   2. Subscribing to a paid plan through /planos → POST
 *      /api/checkout/create-session. With no STRIPE_SECRET_KEY configured
 *      (local dev / this CI), the route takes its mock path and answers
 *      `{ enrolled: true }` — the browser-level flow (auth guard → API →
 *      toast) still runs end-to-end. When Stripe IS configured the same
 *      click would redirect to Stripe Checkout instead.
 *
 * The register endpoint is rate-limited (5/min per IP), so the spec
 * registers ONE fresh user in beforeAll and shares the authenticated
 * session via storage state, running serially.
 */

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

const COURSE_TITLE = "Python para Data Science";

let storageStateFile: string;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  // The /register POST route gets on-demand compiled by the dev server, which
  // can briefly refuse connections under parallel load — the shared helper
  // uses its own synthetic client IP (rate-limiter bucket) and its waitForURL
  // doubles as the retry for transient compile stalls (Playwright re-runs the
  // action on failure).
  await registerUser(page);

  storageStateFile = path.join(os.tmpdir(), `pds-checkout-${Date.now()}.json`);
  await context.storageState({ path: storageStateFile });

  // Pre-warm the checkout route: on-demand compilation can hang a mid-test
  // fetch for 20s+ under parallel load, but here the 120s hook budget covers
  // it, so the plan-subscribe test always hits a compiled route.
  await page.request.post("/api/checkout/create-session", {
    data: { courseId: "plan-pro", courseTitle: "Plano Pro - Ponto do Saber", coursePrice: 29.9 },
  });

  await context.close();
});

test.describe("Checkout", () => {
  // Tests share one registered user; run serially so they can't interleave.
  // The generous budget covers the registration beforeAll (the dev server
  // on-demand compiles /register, so it can need several retries).
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  async function openAuthedPage(
    browser: import("@playwright/test").Browser,
    url: string
  ): Promise<{ page: Page; close: () => Promise<void> }> {
    const context = await browser.newContext({ storageState: storageStateFile });
    const page = await context.newPage();
    await disableAnimations(page);
    await page.goto(url);
    await page.waitForURL((current) => current.pathname === new URL(url, "http://x").pathname, {
      timeout: 20000,
    });
    return { page, close: () => context.close() };
  }

  test("enrolls in a free course and sees it in Meus Cursos", async ({ browser }) => {
    const { page, close } = await openAuthedPage(browser, "/cursos");

    await page.getByText(COURSE_TITLE, { exact: true }).first().click();
    await page.waitForURL(/\/cursos\/[^/]+$/);
    // exact: a course quiz is titled "Avaliação Final - <title>", which also
    // matches a substring heading lookup.
    await expect(page.getByRole("heading", { name: COURSE_TITLE, exact: true })).toBeVisible({
      timeout: 20000,
    });

    // Free courses render "Matricular-se Grátis". On a rerun against the same
    // shared user the course is already enrolled, so only click when present.
    const enrollButton = page.getByRole("button", { name: /Matricular-se/i });
    if (await enrollButton.count()) {
      await enrollButton.click();
      await expect(page.getByText("Matrícula realizada!")).toBeVisible({ timeout: 15000 });
    }
    await expect(page.getByRole("link", { name: /Começar Curso|Continuar Estudos/i })).toBeVisible({
      timeout: 15000,
    });

    // The enrollment shows up in Meus Cursos with a progress card.
    await page.goto("/meus-cursos");
    await expect(page.getByRole("heading", { name: "Meus Cursos" })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText(COURSE_TITLE, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/0\/\d+ aulas/)).toBeVisible({ timeout: 10000 });

    await close();
  });

  test("subscribing to a paid plan runs the checkout API end to end", async ({ browser }) => {
    const { page, close } = await openAuthedPage(browser, "/planos");

    await expect(
      page.getByRole("heading", { name: "Escolha o plano ideal para você" })
    ).toBeVisible({ timeout: 20000 });

    // With no STRIPE_SECRET_KEY the create-session route answers through its
    // mock branch ({ enrolled: true }) and the page shows the success toast.
    // With Stripe configured, this click would redirect to Stripe Checkout.
    // The checkout route is on-demand compiled by the dev server, which can
    // briefly refuse connections under parallel load — retry on the transient
    // "Erro de conexão" toast.
    // The page always surfaces one of the two toasts (success or the
    // transient "Erro de conexão" while the route is being compiled), so
    // race them and only retry on the error case.
    const successToast = page.getByText("Matrícula realizada com sucesso!");
    const errorToast = page.getByText("Erro de conexão. Tente novamente.");
    for (let attempt = 1; attempt <= 3; attempt++) {
      await page.getByRole("button", { name: "Assinar Pro" }).click();
      const outcome = await Promise.race([
        successToast.waitFor({ state: "visible", timeout: 20000 }).then(() => "success"),
        errorToast.waitFor({ state: "visible", timeout: 20000 }).then(() => "error"),
      ]);
      if (outcome === "success") break;
      if (attempt === 3) throw new Error("Plan subscribe did not succeed after 3 attempts");
      // Let the error toast clear before retrying.
      await errorToast.waitFor({ state: "hidden", timeout: 10000 });
    }
    await expect(successToast).toBeVisible();

    await close();
  });
});
