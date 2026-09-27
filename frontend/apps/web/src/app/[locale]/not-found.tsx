import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <section className="container placeholder">
      <h1 className="display-lg">{t("title")}</h1>
      <p>{t("body")}</p>
      <Link href="/">{t("home")}</Link>
    </section>
  );
}
