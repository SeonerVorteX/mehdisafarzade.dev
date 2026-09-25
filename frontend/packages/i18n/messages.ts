import { FALLBACK_LOCALE, type AdminLocale, type Locale } from "./config";

export type Messages = { [key: string]: string | Messages };

/** Recursive merge where `override` wins; used to layer a locale over the `en` fallback. */
export function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    out[key] =
      typeof value === "object" && typeof current === "object" ? deepMerge(current, value) : value;
  }
  return out;
}

type Loader = () => Promise<{ default: Messages }>;

const globalBundles: Record<Locale, Loader> = {
  en: () => import("./locales/global/en.json"),
  az: () => import("./locales/global/az.json"),
  ru: () => import("./locales/global/ru.json"),
};

const webBundles: Record<Locale, Loader> = {
  en: () => import("./locales/web/en.json"),
  az: () => import("./locales/web/az.json"),
  ru: () => import("./locales/web/ru.json"),
};

const adminBundles: Record<AdminLocale, Loader> = {
  en: () => import("./locales/admin/en.json"),
  az: () => import("./locales/admin/az.json"),
};

const load = (l: Loader) => l().then((m) => m.default);

/** fallback(global+app) overlaid with current(global+app). */
async function layered(globalBase: Loader, globalCur: Loader, appBase: Loader, appCur: Loader): Promise<Messages> {
  const [gBase, gCur, aBase, aCur] = await Promise.all([load(globalBase), load(globalCur), load(appBase), load(appCur)]);
  return deepMerge(deepMerge(gBase, aBase), deepMerge(gCur, aCur));
}

/** Messages for the public site: `en` fallback, overlaid with the requested locale. */
export function loadWebMessages(locale: Locale): Promise<Messages> {
  return layered(globalBundles[FALLBACK_LOCALE], globalBundles[locale], webBundles[FALLBACK_LOCALE], webBundles[locale]);
}

/** Messages for the admin app (en/az only; `global` is shared with web). */
export function loadAdminMessages(locale: AdminLocale): Promise<Messages> {
  return layered(globalBundles.en, globalBundles[locale], adminBundles.en, adminBundles[locale]);
}
