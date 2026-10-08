import { Geologica } from "next/font/google";

/** Direction A: Geologica for every role. Glyph coverage verified: Latin, az (Əə Ğğ Iı İi Şş Çç Öö Üü), Cyrillic. */
export const geologica = Geologica({
  subsets: ["latin", "latin-ext", "cyrillic"],
  axes: ["SHRP"],
  variable: "--font-geologica",
  display: "swap",
});
