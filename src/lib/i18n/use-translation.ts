"use client";

import { useEffect, useState } from "react";
import type { Locale, TranslationKey } from "./translations";
import { getTranslations } from "./translations";

export function useTranslation() {
  const [locale, setLocale] = useState<Locale>("pt-BR");

  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored === "en" || stored === "pt-BR") {
      setLocale(stored);
    }
  }, []);

  const t = (key: TranslationKey): string => {
    return getTranslations(locale)[key] || key;
  };

  return { t, locale, setLocale };
}
