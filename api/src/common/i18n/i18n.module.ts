import * as path from 'node:path';
import { Global, Module } from '@nestjs/common';
import {
    AcceptLanguageResolver,
    CookieResolver,
    HeaderResolver,
    I18nJsonLoader,
    I18nModule as NestI18nModule,
    QueryResolver,
} from 'nestjs-i18n';
import { DEFAULT_LOCALE } from '../constants/locales';

/**
 * nestjs-i18n, configured like Examination's `common/i18n/i18n.module.ts`.
 * Resolution order: `?locale=` / `?lang=` → `x-locale` header → `preferredLang`
 * cookie (shared with the web app) → Accept-Language → en.
 *
 * Translations are copied to dist by nest-cli `assets`; `__dirname` points at
 * the right folder in both `src` (ts-node/jest) and `dist`.
 */
@Global()
@Module({
    imports: [
        NestI18nModule.forRoot({
            fallbackLanguage: DEFAULT_LOCALE,
            fallbacks: { 'az-*': 'az', 'en-*': 'en', 'ru-*': 'ru', '*': DEFAULT_LOCALE },
            loader: I18nJsonLoader,
            loaderOptions: { path: path.join(__dirname, 'translations'), watch: false },
            resolvers: [
                new QueryResolver(['locale', 'lang']),
                new HeaderResolver(['x-locale', 'x-lang']),
                new CookieResolver(['preferredLang', 'adminLang']),
                AcceptLanguageResolver,
            ],
        }),
    ],
    exports: [NestI18nModule],
})
export class I18nModule {}
