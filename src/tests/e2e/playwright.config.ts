import { defineConfig, devices } from "@playwright/test";

// The app can be served in three ways:
//  1. PLAYWRIGHT_PORT set  → reuse an already-running dev server (required
//     locally, since Next.js allows only one dev server per directory and
//     the Freebuff preview server holds it on 61737).
//  2. E2E_PRODUCTION=1     → build + serve the production bundle (no
//     on-demand compilation, so /admin never flaps with connection refused).
//  3. default (CI)         → a fresh `npm run dev` on port 3000.
const PORT = process.env.PLAYWRIGHT_PORT || "3000";
const BASE_URL = `http://localhost:${PORT}`;

function webServerCommand(): string {
  if (PORT !== "3000") return "echo reuse-existing";
  if (process.env.E2E_PRODUCTION === "1") return "npm run build && npm run start";
  return "npm run dev";
}

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retry once locally too (the certificate flow touches real seed data and
  // celebration modals), 2 retries in CI for extra stability.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: webServerCommand(),
    url: BASE_URL,
    reuseExistingServer: PORT !== "3000" || !process.env.CI,
    // Production mode runs `next build` first — a cold build on a CI runner
    // can take several minutes, so give it a generous timeout.
    timeout: process.env.E2E_PRODUCTION === "1" ? 420000 : 180000,
  },
});
