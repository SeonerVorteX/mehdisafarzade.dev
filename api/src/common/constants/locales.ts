// Mirrors frontend/packages/i18n/config.ts. Keep the two in sync.
export const LOCALES = ['en', 'az', 'ru'] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'en';

export function isAppLocale(v: unknown): v is AppLocale {
    return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** 'az-Latn-AZ' → 'az'; anything unsupported → 'en'. */
export function resolveLocale(v: unknown): AppLocale {
    if (typeof v !== 'string') return DEFAULT_LOCALE;
    const base = v.toLowerCase().split(/[-_]/)[0];
    return isAppLocale(base) ? base : DEFAULT_LOCALE;
}
