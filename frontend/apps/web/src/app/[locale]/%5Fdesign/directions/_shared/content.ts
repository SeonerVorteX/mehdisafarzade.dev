import { getTranslations } from "next-intl/server";
import type { Locale } from "@portfolio/i18n/config";

/**
 * Shared, true content for the three Phase 5 direction pages (dev only). Every direction renders
 * the same facts so the comparison is about design, not copy.
 */

export const IS_PROD = process.env.NODE_ENV === "production";

export const PROJECT = {
  name: "Examination.az",
  url: "https://www.examination.az",
  stack: ["Next.js", "NestJS", "PostgreSQL", "Prisma", "RabbitMQ", "Redis", "Docker", "nginx"],
} as const;

export const SOCIALS = [
  { key: "GitHub", url: "https://github.com/SeonerVorteX" },
  { key: "LinkedIn", url: "https://www.linkedin.com/in/mehdi-safarzade" },
  { key: "Upwork", url: "https://www.upwork.com/freelancers/mehdisafarzade" },
] as const;

export const EMAIL = "contact@mehdisafarzade.dev";

export const ROUTE_STOPS = ["dataModel", "api", "admin", "interface", "server", "production"] as const;
export const JOBS = [
  { key: "prodata", org: "Prodata MMC" },
  { key: "heroic", org: "Heroic.art" },
  { key: "upwork", org: "Upwork" },
] as const;

/** The real rule from api/prisma/seed.ts, tokenised for per-direction syntax colours. */
export type CodeToken = [kind: "kw" | "fn" | "prop" | "str" | "com" | "pun" | "plain", text: string];
export const CODE: CodeToken[][] = [
  [["kw", "await "], ["plain", "prisma.experience."], ["fn", "upsert"], ["pun", "({"]],
  [["prop", "  where"], ["pun", ": { "], ["prop", "key"], ["pun", ": "], ["plain", "e.key"], ["pun", " },"]],
  [["prop", "  update"], ["pun", ": {},"], ["com", " // leave rows edited in the CMS alone"]],
  [["prop", "  create"], ["pun", ": { "], ["prop", "key"], ["pun", ": "], ["plain", "e.key"], ["pun", ", "], ["prop", "org"], ["pun", ": "], ["plain", "e.org"], ["pun", " },"]],
  [["pun", "});"]],
];

/**
 * A testimonial: the ORIGINAL English text (verbatim, from the `en` messages) plus, outside `en`,
 * the labelled translation for the current locale.
 */
export type Quote = { original: string; translation: string | null; by: string; source: string };

export async function getQuotes(
  locale: Locale,
): Promise<{ quotes: Quote[]; short: Quote; translationLabel: string }> {
  const en = await getTranslations({ locale: "en", namespace: "directions.words" });
  const t = await getTranslations({ locale, namespace: "directions.words" });
  const quotes = (["q1", "q2"] as const).map((k) => ({
    original: en(k),
    translation: locale === "en" ? null : t(k),
    by: t(`${k}By`),
    source: t(`${k}Source`),
  }));
  const short: Quote = {
    original: en("q3"),
    translation: locale === "en" ? null : t("q3"),
    by: t("q3By"),
    source: "",
  };
  return { quotes, short, translationLabel: t("translation") };
}
