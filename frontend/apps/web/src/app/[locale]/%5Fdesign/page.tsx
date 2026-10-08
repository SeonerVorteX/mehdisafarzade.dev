import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// `%5F` = "_": a plain `_design` folder would be a private (non-routed) folder in Next.
const IS_PROD = process.env.NODE_ENV === "production";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  if (IS_PROD) return {};
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "directions" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Dev-only index of the Phase 5 design directions (404 in production builds). */
export default async function DesignIndex({ params }: { params: Promise<{ locale: string }> }) {
  if (IS_PROD) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("directions.index");
  return (
    <main id="main" className="container placeholder" tabIndex={-1}>
      <h1 className="display-lg">{t("title")}</h1>
      <p className="lead">{t("intro")}</p>
      <ul>
        {(["a", "b", "c"] as const).map((d) => (
          <li key={d}>
            <Link href={`/_design/directions/${d}`}>{t(d)}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
