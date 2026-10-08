import { useTranslations } from "next-intl";
import { SiteFooter } from "@/components/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader/SiteHeader";
import { Link } from "@/i18n/navigation";

/** Rendered outside the (site) group, so it brings the site chrome itself. */
export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <>
      <SiteHeader />
      <main id="main" className="site-main" tabIndex={-1}>
        <section className="container placeholder">
          <h1 className="display-lg">{t("title")}</h1>
          <p>{t("body")}</p>
          <Link href="/">{t("home")}</Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
