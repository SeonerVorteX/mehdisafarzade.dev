import {
    availableLocales,
    completeness,
    isPlaceholder,
    pickTranslation,
    readingTimeMin,
    slugify,
} from './content.util';

describe('pickTranslation', () => {
    const ts = [
        { locale: 'en', title: 'Hello' },
        { locale: 'az', title: 'Salam' },
    ];
    it('returns the requested locale', () => {
        expect(pickTranslation(ts, 'az')).toEqual({ t: ts[1], locale: 'az', fallback: false });
    });
    it('falls back to en', () => {
        expect(pickTranslation(ts, 'ru')).toEqual({ t: ts[0], locale: 'en', fallback: true });
    });
    it('returns null without en', () => {
        expect(pickTranslation([{ locale: 'az' }], 'ru')).toBeNull();
    });
    it('lists available locales in canonical order', () => {
        expect(availableLocales([{ locale: 'ru' }, { locale: 'en' }])).toEqual(['en', 'ru']);
    });
});

describe('slugify (az/ru transliteration)', () => {
    it.each([
        ['Hello, v2!', 'hello-v2'],
        ['Salam, dünya: şəhər çiçəyi', 'salam-dunya-sheher-chicheyi'],
        ['Ağıllı İş', 'agilli-ish'],
        ['Привет, мир', 'privet-mir'],
        ['Щука и ёж', 'shchuka-i-ezh'],
        ['  --Mixed   CASE--  ', 'mixed-case'],
        ['Next.js & NestJS', 'next-js-nestjs'],
    ])('%s → %s', (input, slug) => {
        expect(slugify(input)).toBe(slug);
    });
    it('never ends with a dash after truncation', () => {
        expect(slugify('a '.repeat(80))).not.toMatch(/-$/);
    });
});

describe('readingTimeMin', () => {
    it('is at least 1', () => expect(readingTimeMin('hi')).toBe(1));
    it('counts ~200 words per minute', () => expect(readingTimeMin('word '.repeat(1000))).toBe(5));
});

describe('isPlaceholder', () => {
    it.each([
        ['<UPWORK_PROFILE_URL>', true],
        ['', true],
        [null, true],
        ['https://github.com/x', false],
    ])('%p → %p', (v, expected) => expect(isPlaceholder(v)).toBe(expected));
});

describe('completeness', () => {
    it('reports missing fields per locale', () => {
        const report = completeness(
            [
                { locale: 'en', title: 'T', body: 'B' },
                { locale: 'az', title: 'T', body: '  ' },
            ],
            ['title', 'body'],
        );
        expect(report.en).toEqual({ complete: true, missing: [] });
        expect(report.az).toEqual({ complete: false, missing: ['body'] });
        expect(report.ru).toEqual({ complete: false, missing: ['title', 'body'] });
    });
});
