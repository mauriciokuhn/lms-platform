"use client";

import { useSyncExternalStore } from "react";
import type { Locale, TranslationKey } from "./translations";
import { getTranslations } from "./translations";

// ──────────────────────────────────────────
// External store: persisted locale (localStorage)
// ──────────────────────────────────────────

const listeners = new Set<() => void>();

/** Reads the persisted locale on the client; always pt-BR on the server. */
export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "pt-BR";
  const stored = localStorage.getItem("locale") as Locale | null;
  if (stored === "en" || stored === "pt-BR") return stored;

  // Fallback: read the cookie written by LocaleSwitcher (keeps server
  // components and client components in sync on first visit after update).
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  const cookieLocale = match?.[1] as Locale | undefined;
  return cookieLocale === "en" || cookieLocale === "pt-BR" ? cookieLocale : "pt-BR";
}

/** Persists the locale and notifies subscribers (keeps the useTranslation API). */
export function setStoredLocale(next: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem("locale", next);
  listeners.forEach((l) => l());
}

function subscribeLocale(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Hydration-safe read of the persisted locale.
 *
 * getServerSnapshot returns "pt-BR" so the server HTML always matches; once
 * hydrated, React re-renders with the value from localStorage. No effects and
 * no setState-in-effect involved.
 */
export function usePersistedLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getStoredLocale, () => "pt-BR");
}

export function useTranslation() {
  const locale = usePersistedLocale();

  const t = (key: TranslationKey): string => {
    return getTranslations(locale)[key] || key;
  };

  return { t, locale, setLocale: setStoredLocale };
}
