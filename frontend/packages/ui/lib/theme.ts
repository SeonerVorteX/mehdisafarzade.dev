import { THEME_COOKIE, type Theme } from "@portfolio/config";

/** Theme preference (PLAN §7): `light` | `dark` | `system` (follows `prefers-color-scheme`). */
export type ThemePreference = Theme;
export type ResolvedTheme = "light" | "dark";

/**
 * Inline, render-blocking script for `<head>`: resolves the cookie (default `system`)
 * and sets `data-theme` (resolved) + `data-theme-pref` on <html> before first paint,
 * so statically rendered pages never flash. Kept as one constant string so the web
 * CSP can allow it by hash (Phase 6) instead of forcing per-request nonces.
 */
export const THEME_SCRIPT =
  '(function(){try{var m=document.cookie.match(/(?:^|;\\s*)theme=(light|dark|system)(?:;|$)/);' +
  'var p=m?m[1]:"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);' +
  'var h=document.documentElement;h.setAttribute("data-theme",d?"dark":"light");h.setAttribute("data-theme-pref",p);}catch(e){}})();';

export function resolveTheme(pref: ThemePreference, prefersDark: boolean): ResolvedTheme {
  return pref === "dark" || (pref === "system" && prefersDark) ? "dark" : "light";
}

/** `document.cookie` assignment string for the preference (1 year, Lax; shared domain + Secure in production). */
export function themeCookie(pref: ThemePreference, opts: { domain?: string; secure?: boolean } = {}): string {
  const parts = [`${THEME_COOKIE}=${pref}`, "Path=/", `Max-Age=${60 * 60 * 24 * 365}`, "SameSite=Lax"];
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}
