import { getTranslations } from "next-intl/server";

export default async function AdminHome() {
  const t = await getTranslations("shell");
  return (
    <main className="placeholder">
      <p>{t("placeholder")}</p>
    </main>
  );
}
