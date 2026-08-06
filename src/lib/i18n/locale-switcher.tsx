"use client";

import { useSyncExternalStore } from "react";
import type { Locale } from "./translations";
import { getFlag, getLabel } from "./translations";
import { getStoredLocale } from "./use-translation";

const emptySubscribe = () => () => {};

export function LocaleSwitcher() {
  const locale = useSyncExternalStore<Locale>(emptySubscribe, getStoredLocale, () => "pt-BR");
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  function toggleLocale() {
    const next: Locale = locale === "pt-BR" ? "en" : "pt-BR";
    localStorage.setItem("locale", next);
    // Keep a cookie in sync so server components (privacidade, termos)
    // can read the locale too. SameSite=Lax keeps it sent on navigation.
    document.cookie = `locale=${next};path=/;max-age=31536000;samesite=lax`;
    // Reload to apply translations throughout the app
    window.location.reload();
  }

  if (!mounted) {
    return <div className="h-9 w-16" />;
  }

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      title={`Mudar para ${locale === "pt-BR" ? "English" : "Português"}`}
    >
      <span>{getFlag(locale)}</span>
      <span>{getLabel(locale)}</span>
    </button>
  );
}
