// Same helpers as Examination's `common/utils/i18n.util.ts`.
export function isI18nKeyString(s: unknown): s is string {
    return typeof s === 'string' && (s.startsWith('i18n:') || (/^[a-z0-9]+(\.[\w-]+)+$/i.test(s) && !/\s/.test(s)));
}

export function stripPrefix(key: string): string {
    return key.startsWith('i18n:') ? key.slice('i18n:'.length) : key;
}
