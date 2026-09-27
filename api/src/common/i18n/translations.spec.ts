import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES } from '../constants/locales';

const dir = join(__dirname, 'translations');
const keys = (obj: object, prefix = ''): string[] =>
    Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object' ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
    );
const load = (locale: string, file: string) =>
    JSON.parse(readFileSync(join(dir, locale, file), 'utf8')) as Record<string, unknown>;

describe('API translations', () => {
    const files = readdirSync(join(dir, 'en')).filter((f) => f.endsWith('.json'));

    it.each(files)('%s has the same keys and placeholders in every locale', (file) => {
        const en = load('en', file);
        for (const locale of LOCALES.filter((l) => l !== 'en')) {
            const other = load(locale, file);
            expect(keys(other).sort()).toEqual(keys(en).sort());
            for (const key of keys(en)) {
                const get = (o: Record<string, unknown>) =>
                    String(key.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], o));
                // Case-insensitive: ru writes «{property}» mid-sentence where en starts with {Property}.
                const args = (s: string) => (s.match(/\{\w+\}/g) ?? []).map((a) => a.toLowerCase()).sort();
                expect({ key, locale, args: args(get(other)) }).toEqual({ key, locale, args: args(get(en)) });
            }
        }
    });

    it('every i18n key used in the source exists', () => {
        const src = join(__dirname, '..', '..');
        const walk = (d: string): string[] =>
            readdirSync(d, { withFileTypes: true }).flatMap((e) =>
                e.isDirectory()
                    ? walk(join(d, e.name))
                    : e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')
                      ? [join(d, e.name)]
                      : [],
            );
        const used = new Set<string>();
        for (const f of walk(src)) {
            const code = readFileSync(f, 'utf8').replace(/^\s*(\/\/|\*).*$/gm, ''); // skip comments (doc examples)
            for (const m of code.matchAll(/(?:i18nKey: |'i18n:)'?([a-z]+\.[A-Z_]+)'/g)) used.add(m[1]);
        }
        const known = new Set(files.flatMap((f) => keys(load('en', f)).map((k) => `${f.replace('.json', '')}.${k}`)));
        expect([...used].filter((k) => !known.has(k))).toEqual([]);
        expect(used.size).toBeGreaterThan(20);
    });
});
