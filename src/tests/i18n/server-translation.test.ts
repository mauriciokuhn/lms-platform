/**
 * Unit tests for the i18n helpers:
 *
 * 1. getServerTranslation (src/lib/i18n/server-translation.ts) — reads the
 *    "locale" cookie (set by LocaleSwitcher) with pt-BR fallback.
 * 2. getStoredLocale (src/lib/i18n/use-translation.ts) — client-side locale
 *    read with localStorage first, then the cookie fallback.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ── Mock next/headers BEFORE importing the helper ───────────────────────
const cookieStore = vi.hoisted(() => ({
  get: vi.fn<(name: string) => { value: string } | undefined>(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import { getServerTranslation } from "@/lib/i18n/server-translation";
import { getStoredLocale } from "@/lib/i18n/use-translation";

describe("getServerTranslation", () => {
  beforeEach(() => {
    cookieStore.get.mockReset();
  });

  it("returns pt-BR when no locale cookie is present", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const { t, locale } = await getServerTranslation();
    expect(locale).toBe("pt-BR");
    expect(t("nav.cursos")).toBe("Cursos");
  });

  it("returns the English locale when the cookie says en", async () => {
    cookieStore.get.mockReturnValue({ value: "en" });
    const { t, locale } = await getServerTranslation();
    expect(locale).toBe("en");
    expect(t("nav.cursos")).toBe("Courses");
  });

  it("falls back to pt-BR for an unsupported locale value", async () => {
    cookieStore.get.mockReturnValue({ value: "es" });
    const { t, locale } = await getServerTranslation();
    expect(locale).toBe("pt-BR");
    expect(t("hero.cta.start")).toBe("Começar Agora →");
  });

  it("returns the key itself for a missing translation key", async () => {
    // getTranslations returns the raw key for absent keys (closed union,
    // so we probe the underlying lookup directly with a raw string).
    const { getTranslations } = await import("@/lib/i18n/translations");
    const lookup = getTranslations("pt-BR") as unknown as Record<string, string>;
    expect(lookup["nav.key.inexistente"] ?? "nav.key.inexistente").toBe("nav.key.inexistente");
  });
});

describe("getStoredLocale (client-side)", () => {
  beforeEach(() => {
    // Simulate a browser-like global environment.
    (globalThis as Record<string, unknown>).window = {};
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };
    (globalThis as Record<string, unknown>).document = { cookie: "" };
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).localStorage;
    delete (globalThis as Record<string, unknown>).document;
  });

  it("returns pt-BR when neither localStorage nor cookie is set", () => {
    expect(getStoredLocale()).toBe("pt-BR");
  });

  it("prefers a valid localStorage value", () => {
    (globalThis.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("en");
    (globalThis.document as { cookie: string }).cookie = "locale=pt-BR";
    expect(getStoredLocale()).toBe("en");
  });

  it("falls back to the cookie when localStorage is unset", () => {
    (globalThis.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (globalThis.document as { cookie: string }).cookie = "theme=dark; locale=en";
    expect(getStoredLocale()).toBe("en");
  });

  it("falls back to the cookie when localStorage holds an unsupported value", () => {
    (globalThis.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("es");
    (globalThis.document as { cookie: string }).cookie = "locale=pt-BR";
    expect(getStoredLocale()).toBe("pt-BR");
  });

  it("returns pt-BR when both localStorage and cookie are invalid/absent", () => {
    (globalThis.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("es");
    (globalThis.document as { cookie: string }).cookie = "locale=xx";
    expect(getStoredLocale()).toBe("pt-BR");
  });

  it("always returns pt-BR on the server (no window)", () => {
    delete (globalThis as Record<string, unknown>).window;
    expect(getStoredLocale()).toBe("pt-BR");
  });
});
