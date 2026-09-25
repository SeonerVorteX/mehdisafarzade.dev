export const SITE_NAME = "Mehdi Safarzade";
export const SITE_DOMAIN = "mehdisafarzade.dev";
/** Canonical public origin. The apex 301-redirects here (Cloudflare Redirect Rule + nginx fallback). */
export const CANONICAL_ORIGIN = `https://www.${SITE_DOMAIN}`;
/** Parent domain for cookies shared across subdomains (preferredLang, theme). Production only. */
export const COOKIE_DOMAIN = `.${SITE_DOMAIN}`;

export const THEME_COOKIE = "theme";
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
export function isTheme(v: unknown): v is Theme {
  return typeof v === "string" && (THEMES as readonly string[]).includes(v);
}

export const BREAKPOINTS = {
  xxs: 375,
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;
