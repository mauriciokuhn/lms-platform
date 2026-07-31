"use client";

import { useEffect, useState } from "react";
import type { Locale } from "./translations";
import { getFlag, getLabel } from "./translations";

export function LocaleSwitcher() {
  const [locale, setLocale] = useState<Locale>("pt-BR");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored === "en" || stored === "pt-BR") {
      setLocale(stored);
    }
  }, []);

  function toggleLocale() {
    const next: Locale = locale === "pt-BR" ? "en" : "pt-BR";
    setLocale(next);
    localStorage.setItem("locale", next);
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
