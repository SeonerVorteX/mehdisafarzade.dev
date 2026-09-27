import { Fraunces, Inter, JetBrains_Mono, Literata } from "next/font/google";

/**
 * Self-hosted by next/font (no request to Google at runtime). Subsets: latin + latin-ext
 * (az: ə ğ ı ş ç ö ü) + cyrillic (ru) where the family has them.
 *
 * The display candidates (Fraunces, Instrument Serif) have NO Cyrillic. We can't chain a
 * Cyrillic font after them: next/font always adds a metric-adjusted local fallback (Times,
 * full Unicode range; `adjustFontFallback: false` is ignored under Turbopack) that would
 * catch the Cyrillic glyphs first. So `html[lang="ru"]` switches `--font-display` to
 * Literata (root.scss). Literata isn't preloaded: only Russian pages use it.
 */
export const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "SOFT"],
  variable: "--font-fraunces",
  display: "swap",
});

export const cyrillicSerif = Literata({
  subsets: ["cyrillic"],
  axes: ["opsz"],
  variable: "--font-cyrillic-serif",
  display: "swap",
  preload: false,
});

export const fontVariables = [inter.variable, jetbrainsMono.variable, fraunces.variable, cyrillicSerif.variable].join(
  " ",
);
