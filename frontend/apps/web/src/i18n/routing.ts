import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES, PREFERRED_LANG_COOKIE } from "@portfolio/i18n/config";
import { COOKIE_DOMAIN } from "@portfolio/config";

const isProd = process.env.NODE_ENV === "production";

/**
 * Always-prefixed locales (`/en`, `/az`, `/ru`). A bare `/` resolves the
 * `preferredLang` cookie, then `Accept-Language`, then `en` (Phase 0 answer 1).
 * The cookie is shared across subdomains in production, as in Examination's landing app.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeDetection: true,
  localeCookie: {
    name: PREFERRED_LANG_COOKIE,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: isProd,
    ...(isProd ? { domain: COOKIE_DOMAIN } : {}),
  },
});
