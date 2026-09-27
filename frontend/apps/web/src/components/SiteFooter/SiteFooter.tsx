import { ArrowUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NAV_ITEMS } from "../SiteHeader/SiteHeader";

/** Social links come from the profile API in Phase 6. */
export async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__meta">
          <p className="site-footer__rights">{t("rights", { year: new Date().getFullYear() })}</p>
          <p className="site-footer__built">{t("builtWith")}</p>
        </div>
        <nav aria-label={nav("label")}>
          <ul className="site-footer__links">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href}>{nav(item.key)}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <a href="#top" className="site-footer__top">
          {t("backToTop")}
          <ArrowUp aria-hidden size={14} strokeWidth={1.75} />
        </a>
      </div>
    </footer>
  );
}
