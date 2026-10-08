import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { THEME_SCRIPT } from "@portfolio/ui/lib";
import { SITE_URL } from "@/config/env";
import { pickMessages, SHELL_CLIENT_NAMESPACES } from "@/i18n/clientMessages";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/styles/fonts";
import "@/styles/main.scss";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e10" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const clientMessages = pickMessages(await getMessages(), SHELL_CLIENT_NAMESPACES);

  // No cookies() read here: pages stay static/ISR. The theme is applied before paint by
  // THEME_SCRIPT, which is why <html> needs suppressHydrationWarning (data-theme differs).
  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <NextIntlClientProvider messages={clientMessages}>
          <a href="#main" className="skip-link">
            {t("skipToContent")}
          </a>
          {/* Each route group renders its own chrome and the #main landmark. */}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
