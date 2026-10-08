import { Nunito } from "next/font/google";

/** Direction C: Nunito for every role (rounded, warm). Coverage verified: Latin, az, Cyrillic. */
export const nunito = Nunito({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-nunito",
  display: "swap",
});
