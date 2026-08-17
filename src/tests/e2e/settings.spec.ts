import { test, expect, type Page } from "@playwright/test";
import path from "path";
import os from "os";
import { registerUser } from "./register";

/**
 * Notification settings flow (Configurações): sound toggle + tone selector,
 * vibration, the browser push card, "Não Perturbe" time window, and the
 * preview button.
 *
 * The register endpoint is rate-limited (5/min per IP), so the spec
 * registers ONE fresh user in beforeAll and shares the authenticated
 * session across tests via storage state. Each test then resets the
 * user's settings through the API so assertions start from the built-in
 * defaults (sound on, CHIME tone, vibration on, DND off) regardless of
 * what a previous (possibly failed) test left behind.
 *
 * The push card is asserted defensively: in browsers without PushManager
 * support the page shows the "não suporta" notice instead of the toggle.
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

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  soundTone: "CHIME",
  vibrationEnabled: true,
  doNotDisturb: false,
  dndStartTime: null,
  dndEndTime: null,
};

let storageStateFile: string;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await registerUser(page);

  storageStateFile = path.join(os.tmpdir(), `pds-settings-${Date.now()}.json`);
  await context.storageState({ path: storageStateFile });
  await context.close();
});

test.describe("Notification Settings", () => {
  // Tests share the same registered user and mutate its settings; run them
  // one at a time so they can't interleave on the shared account.
  test.describe.configure({ mode: "serial" });

  async function openSettings(browser: import("@playwright/test").Browser): Promise<{
    page: Page;
    close: () => Promise<void>;
  }> {
    const context = await browser.newContext({ storageState: storageStateFile });
    const page = await context.newPage();
    await disableAnimations(page);
    await page.goto("/configuracoes");
    await page.waitForURL("/configuracoes", { timeout: 20000 });

    // Back to a known state: reset the shared user's settings to defaults.
    await page.request.patch("/api/settings", { data: DEFAULT_SETTINGS });
    await page.reload();
    return {
      page,
      close: () => context.close(),
    };
  }

  test("renders all the preference cards with the default sound state", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    await expect(page.getByRole("heading", { name: "Configurações" }).first()).toBeVisible({
      timeout: 20000,
    });

    for (const card of [
      "Som das Notificações",
      "Vibração",
      "Notificações Push (navegador)",
      "Não Perturbe",
      "Prévia",
    ]) {
      await expect(page.getByText(card, { exact: true })).toBeVisible({ timeout: 10000 });
    }

    // Defaults: sound on (switch checked) + tone selector visible with CHIME selected.
    const soundSwitch = page.getByRole("switch", { name: "Ativar som" });
    await expect(soundSwitch).toBeVisible();
    await expect(soundSwitch).toBeChecked();
    await expect(page.getByText("Chime Suave", { exact: true })).toBeVisible();
    await expect(page.getByText("Pop Rápido", { exact: true })).toBeVisible();

    await close();
  });

  test("toggling sound off hides the tone selector", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    const soundSwitch = page.getByRole("switch", { name: "Ativar som" });
    await expect(soundSwitch).toBeVisible({ timeout: 20000 });

    // Turn sound off → tone grid disappears.
    await soundSwitch.click();
    await expect(soundSwitch).not.toBeChecked({ timeout: 10000 });
    await expect(page.getByText("Chime Suave", { exact: true })).toBeHidden({ timeout: 10000 });

    // Turn it back on → tone grid returns (restores the default state).
    await soundSwitch.click();
    await expect(soundSwitch).toBeChecked({ timeout: 10000 });
    await expect(page.getByText("Chime Suave", { exact: true })).toBeVisible();

    await close();
  });

  test("changing the tone updates the preview button", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    await expect(page.getByText("Chime Suave", { exact: true })).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: "Pop Rápido" }).click();
    // Toast confirms the change; the preview button follows the saved tone.
    await expect(page.getByText(/Tom alterado para "Pop Rápido"/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Testar Pop Rápido" })).toBeVisible({
      timeout: 10000,
    });

    await close();
  });

  test("push toggle subscribes the browser to push notifications", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStateFile });
    // Grant notification permission up front so requestPermission() resolves
    // to "granted" without a native dialog.
    await context.grantPermissions(["notifications"]);
    // Chromium launched by Playwright rejects the real pushManager.subscribe()
    // ("Push API not supported in incognito mode" — crbug 41124656). Stub ONLY
    // the browser's push API so the full app flow runs for real: VAPID fetch →
    // subscribe → POST /api/push/subscribe → toggle + toast.
    await context.addInitScript(() => {
      // `sub` is a minimal fake PushSubscription — the hook only reads
      // toJSON()/unsubscribe(), so type it loosely (the browser DOM lib
      // would otherwise reject the prototype reassignment below).
      let sub: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
        toJSON(): { endpoint: string; keys: { p256dh: string; auth: string } };
        unsubscribe(): Promise<boolean>;
      } | null = null;
      const makeSubscription = () => {
        const endpoint = `https://fcm.googleapis.com/fcm/send/e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const keys = {
          p256dh: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkRxZ8E4y7Qk2l7M1d2p7f9s0Q0j8v6c5a3b1d0f1e2a3b4c5d6e7f8g9h0",
          auth: "aGVsbG8td29ybGQtYXV0aC1rZXk",
        };
        return {
          endpoint,
          keys,
          toJSON() {
            return { endpoint, keys };
          },
          async unsubscribe() {
            sub = null;
            return true;
          },
        };
      };
      // Cast through unknown: the fake is structurally compatible with the
      // parts of PushSubscription the hook uses.
      (PushManager.prototype as unknown as { getSubscription: unknown }).getSubscription =
        async function () {
          return sub as unknown as PushSubscription | null;
        };
      (PushManager.prototype as unknown as { subscribe: unknown }).subscribe = async function () {
        sub = makeSubscription();
        return sub as unknown as PushSubscription;
      };
    });
    const page = await context.newPage();
    await disableAnimations(page);
    await page.goto("/configuracoes");
    await page.waitForURL("/configuracoes", { timeout: 20000 });

    // The server must expose the VAPID public key for a real subscription.
    const keyRes = await page.request.get("/api/push/subscribe");
    const { vapidPublicKey } = await keyRes.json();

    const pushSwitch = page.getByRole("switch", { name: "Ativar notificações push" });
    await expect(pushSwitch).toBeVisible({ timeout: 20000 });
    await expect(pushSwitch).not.toBeChecked();

    if (!vapidPublicKey) {
      // VAPID not configured (e.g. CI without the env vars): the toggle must
      // still fail gracefully with the server-side message.
      await pushSwitch.click();
      await expect(page.getByText(/ainda não configuradas no servidor/)).toBeVisible({
        timeout: 15000,
      });
      await context.close();
      return;
    }

    await pushSwitch.click();
    await expect(pushSwitch).toBeChecked({ timeout: 20000 });
    await expect(page.getByText("Notificações push ativadas! 🔔")).toBeVisible({
      timeout: 10000,
    });

    // Toggle off again so the shared account stays clean for reruns.
    await pushSwitch.click();
    await expect(pushSwitch).not.toBeChecked({ timeout: 15000 });

    await context.close();
  });

  test("push card shows the enable toggle (or the unsupported notice)", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    await expect(page.getByText("Notificações Push (navegador)", { exact: true })).toBeVisible({
      timeout: 20000,
    });

    const pushSwitch = page.getByRole("switch", { name: "Ativar notificações push" });
    const unsupported = page.getByText(/não suporta notificações push/i);

    // In headless Chromium PushManager is available, so the toggle renders;
    // in other browsers the page shows the fallback notice instead.
    if (await pushSwitch.count()) {
      await expect(pushSwitch).toBeVisible();
      await expect(pushSwitch).not.toBeChecked();
    } else {
      await expect(unsupported).toBeVisible();
    }

    await close();
  });

  test("modo silencioso reveals the DND time window", async ({ browser }) => {
    const { page, close } = await openSettings(browser);

    const dndSwitch = page.getByRole("switch", { name: "Ativar modo silencioso" });
    await expect(dndSwitch).toBeVisible({ timeout: 20000 });
    await expect(dndSwitch).not.toBeChecked();

    // Off by default → time inputs hidden; enabling DND reveals Início/Fim.
    await expect(page.getByText("Início", { exact: true })).toBeHidden();
    await dndSwitch.click();
    await expect(dndSwitch).toBeChecked({ timeout: 10000 });
    await expect(page.getByText("Início", { exact: true })).toBeVisible();
    await expect(page.getByText("Fim", { exact: true })).toBeVisible();

    await close();
  });
});
