import { Menu } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "../LanguageSwitcher/LanguageSwitcher";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";

export const NAV_ITEMS = [
  { key: "work", href: "/projects" },
  { key: "blog", href: "/blog" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

/** Server component; only the theme toggle and language switcher hydrate. */
export async function SiteHeader() {
  const t = await getTranslations("nav");
  const common = await getTranslations("common");

  const links = NAV_ITEMS.map((item) => (
    <li key={item.key}>
      <Link href={item.href} className="site-nav__link">
        {t(item.key)}
      </Link>
    </li>
  ));

  return (
    <header className="site-header" id="top">
      <div className="container site-header__inner">
        <Link href="/" className="site-header__brand" aria-label={t("home")}>
          <span className="site-header__mark" aria-hidden>
            MS
          </span>
          <span className="site-header__name">{common("siteName")}</span>
        </Link>

        <nav className="site-nav" aria-label={t("label")}>
          <ul className="site-nav__list">{links}</ul>
        </nav>

        <div className="site-header__tools">
          <LanguageSwitcher />
          <ThemeToggle />
          {/* <details> works without JS; Phase 6 closes it on navigation. */}
          <details className="site-nav-mobile">
            <summary className="icon-button" aria-label={t("menu")}>
              <Menu aria-hidden size={18} strokeWidth={1.75} />
            </summary>
            <nav className="site-nav-mobile__panel" aria-label={t("label")}>
              <ul>{links}</ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
