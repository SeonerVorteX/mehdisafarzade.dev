import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { loadWebMessages } from "@portfolio/i18n/messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: await loadWebMessages(locale) };
});
