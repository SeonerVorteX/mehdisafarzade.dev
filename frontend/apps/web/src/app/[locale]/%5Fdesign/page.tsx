import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { pickMessages, SHELL_CLIENT_NAMESPACES } from "@/i18n/clientMessages";
import { DesignTile } from "./DesignTile";
import { instrumentSerif } from "./fonts";

// `%5F` = "_": a plain `_design` folder would be a private (non-routed) folder in Next.
const IS_PROD = process.env.NODE_ENV === "production";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  if (IS_PROD) return {};
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "design" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** PLAN §7: dev-only style tile (404 in production builds). */
export default async function DesignPage({ params }: { params: Promise<{ locale: string }> }) {
  if (IS_PROD) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = pickMessages(await getMessages(), [...SHELL_CLIENT_NAMESPACES, "design"]);
  return (
    <div className={instrumentSerif.variable}>
      <NextIntlClientProvider messages={messages}>
        <DesignTile />
      </NextIntlClientProvider>
    </div>
  );
}
