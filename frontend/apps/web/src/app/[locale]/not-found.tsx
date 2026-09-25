import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="placeholder">
      <h1>{t("title")}</h1>
      <p>{t("body")}</p>
      <Link href="/">{t("home")}</Link>
    </main>
  );
}
