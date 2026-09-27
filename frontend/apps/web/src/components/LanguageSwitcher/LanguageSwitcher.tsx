"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALE_LABELS, LOCALES } from "@portfolio/i18n/config";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * Plain links (work without JS, crawlable). next-intl's Link with `locale` sets the
 * preferredLang cookie on navigation. Pages whose slug differs per locale (posts)
 * pass their own alternates in Phase 6.
 */
export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav className="segmented" aria-label={t("label")}>
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          hrefLang={l}
          lang={l}
          className="segmented__item segmented__item--text"
          aria-current={l === locale ? "true" : undefined}
          data-active={l === locale || undefined}
          title={LOCALE_LABELS[l]}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
