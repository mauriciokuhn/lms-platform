import { cookies } from "next/headers";
import { getTranslations, type Locale, type TranslationKey } from "./translations";

/**
 * Server-only translation helper.
 * Use in server components (pages without "use client").
 *
 * Lê o idioma do cookie "locale" (gravado pelo LocaleSwitcher ao trocar de
 * idioma) com fallback para pt-BR. Isso mantém a consistência com a
 * persistência em localStorage usada pelos componentes client.
 *
 * Usage:
 *   import { getServerTranslation } from "@/lib/i18n/server-translation";
 *   const { t, locale } = await getServerTranslation();
 *   <h1>{t("privacy.title")}</h1>
 */
export async function getServerTranslation() {
  const cookieStore = await cookies();
  const stored = cookieStore.get("locale")?.value as Locale | undefined;
  const locale: Locale = stored === "en" || stored === "pt-BR" ? stored : "pt-BR";

  const t = (key: TranslationKey): string => {
    return getTranslations(locale)[key] || key;
  };

  return { t, locale };
}
