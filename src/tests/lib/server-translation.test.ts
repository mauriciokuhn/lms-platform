/**
 * Unit tests for the server-side translation helper
 * (src/lib/i18n/server-translation.ts). The `next/headers` cookie store is
 * mocked; locale detection, the pt-BR fallback and unknown-key passthrough
 * are covered.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTranslations, type TranslationKey } from "@/lib/i18n/translations";

const cookiesGetMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookiesGetMock }),
}));

import { getServerTranslation } from "@/lib/i18n/server-translation";

function firstKey(locale: "pt-BR" | "en"): TranslationKey {
  return Object.keys(getTranslations(locale))[0] as TranslationKey;
}

describe("getServerTranslation", () => {
  beforeEach(() => {
    cookiesGetMock.mockReset();
  });

  it("defaults to pt-BR when there is no locale cookie", async () => {
    cookiesGetMock.mockReturnValue(undefined);
    const { locale, t } = await getServerTranslation();
    expect(locale).toBe("pt-BR");

    const key = firstKey("pt-BR");
    expect(t(key)).toBe(getTranslations("pt-BR")[key]);
  });

  it("uses the en locale when the cookie says en", async () => {
    cookiesGetMock.mockReturnValue({ value: "en" });
    const { locale, t } = await getServerTranslation();
    expect(locale).toBe("en");

    const key = firstKey("en");
    expect(t(key)).toBe(getTranslations("en")[key]);
  });

  it("accepts an explicit pt-BR cookie", async () => {
    cookiesGetMock.mockReturnValue({ value: "pt-BR" });
    const { locale } = await getServerTranslation();
    expect(locale).toBe("pt-BR");
  });

  it("falls back to pt-BR for an unsupported locale value", async () => {
    cookiesGetMock.mockReturnValue({ value: "fr" });
    const { locale } = await getServerTranslation();
    expect(locale).toBe("pt-BR");
  });

  it("returns the key itself for unknown translation keys", async () => {
    cookiesGetMock.mockReturnValue(undefined);
    const { t } = await getServerTranslation();
    expect(t("unknown.key.xyz" as never)).toBe("unknown.key.xyz");
  });
});
