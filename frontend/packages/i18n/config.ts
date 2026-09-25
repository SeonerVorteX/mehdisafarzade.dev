export const PREFERRED_LANG_COOKIE = "preferredLang";

/** Public site locales. Content is translated per locale in the database. */
export const LOCALES = ["en", "az", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const FALLBACK_LOCALE: Locale = "en";

/** Admin UI locales (brief §4: at least en + az). */
export const ADMIN_LOCALES = ["en", "az"] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];
export const ADMIN_DEFAULT_LOCALE: AdminLocale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  az: "Azərbaycanca",
  ru: "Русский",
};

export function isLocale(v: string | null | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

export function isAdminLocale(v: string | null | undefined): v is AdminLocale {
  return !!v && (ADMIN_LOCALES as readonly string[]).includes(v);
}

export function resolveLocale(v: string | null | undefined): Locale {
  return isLocale(v) ? v : FALLBACK_LOCALE;
}
