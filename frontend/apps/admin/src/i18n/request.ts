import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { ADMIN_DEFAULT_LOCALE, isAdminLocale } from "@portfolio/i18n/config";
import { loadAdminMessages } from "@portfolio/i18n/messages";

/** Admin has no locale in the URL; the choice is stored in a host-only cookie. */
export const ADMIN_LANG_COOKIE = "adminLang";

export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(ADMIN_LANG_COOKIE)?.value;
  const locale = isAdminLocale(fromCookie) ? fromCookie : ADMIN_DEFAULT_LOCALE;
  return { locale, messages: await loadAdminMessages(locale) };
});
