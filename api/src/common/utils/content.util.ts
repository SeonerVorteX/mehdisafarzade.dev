import { DEFAULT_LOCALE, LOCALES, type AppLocale } from '../constants/locales';

/** Content is translated per locale in the database; missing translations fall back to `en` (brief §4). */
export const FALLBACK_LOCALE: AppLocale = DEFAULT_LOCALE;

export type Localized<T> = { t: T; locale: AppLocale; fallback: boolean };

/**
 * Picks the requested locale, else the `en` fallback, else nothing. `fallback: true`
 * lets the web show its "not available in your language" notice and point the
 * canonical URL at `en`.
 */
export function pickTranslation<T extends { locale: string }>(
    translations: T[],
    locale: AppLocale,
): Localized<T> | null {
    const exact = translations.find((t) => t.locale === locale);
    if (exact) return { t: exact, locale, fallback: false };
    const fb = translations.find((t) => t.locale === FALLBACK_LOCALE);
    if (fb) return { t: fb, locale: FALLBACK_LOCALE, fallback: true };
    return null;
}

export function availableLocales(translations: { locale: string }[]): AppLocale[] {
    return LOCALES.filter((l) => translations.some((t) => t.locale === l));
}

/** ~200 words/min, code blocks count less; never below 1. */
export function readingTimeMin(markdown: string): number {
    const withoutCode = markdown.replace(/```[\s\S]*?```/g, (block) => ' '.repeat(Math.ceil(block.length / 3)));
    const words = withoutCode.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

// Transliteration for slugs (brief §7: az/ru). Russian follows a simple, readable
// scheme (ж→zh, х→kh, ц→ts, ч→ch, ш→sh, щ→shch, ю→yu, я→ya).
const AZ: Record<string, string> = { ə: 'e', ı: 'i', ö: 'o', ü: 'u', ş: 'sh', ç: 'ch', ğ: 'g', i̇: 'i' };
// prettier-ignore
const RU: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k',
    л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
    const lowered = input.toLocaleLowerCase('az');
    let out = '';
    for (const ch of lowered) out += AZ[ch] ?? RU[ch] ?? ch;
    return out
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 96)
        .replace(/-+$/g, '');
}

/** Links still holding a "<PLACEHOLDER>" from the seed are hidden from the public site. */
export function isPlaceholder(value: string | null | undefined): boolean {
    return !value || /^<[^>]+>$/.test(value.trim());
}

export type Completeness = Record<AppLocale, { complete: boolean; missing: string[] }>;

/** Per-locale completeness: which required fields are missing or empty. */
export function completeness<T extends { locale: string }>(
    translations: T[],
    required: (keyof T & string)[],
): Completeness {
    const out = {} as Completeness;
    for (const locale of LOCALES) {
        const t = translations.find((x) => x.locale === locale);
        const missing = t
            ? required.filter((f) => {
                  const v = t[f];
                  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
              })
            : [...required];
        out[locale] = { complete: missing.length === 0, missing };
    }
    return out;
}
