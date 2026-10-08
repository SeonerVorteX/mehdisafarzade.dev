import { Inter, JetBrains_Mono } from "next/font/google";

/**
 * Interim shell fonts while Phase 5 picks a direction (2026-10-08: the first tile's
 * Fraunces/Literata world was rejected). The chosen direction replaces these.
 * Self-hosted by next/font; latin + latin-ext (az) + cyrillic (ru).
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

export const fontVariables = [inter.variable, jetbrainsMono.variable].join(" ");
