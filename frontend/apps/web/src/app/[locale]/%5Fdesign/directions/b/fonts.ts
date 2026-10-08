import { Commissioner } from "next/font/google";

/**
 * Direction B: Commissioner for every role. Its FLAR axis carves flared, wood-cut terminals for
 * display text while body text stays plain (FLAR 0). Coverage verified: Latin, az, Cyrillic.
 */
export const commissioner = Commissioner({
  subsets: ["latin", "latin-ext", "cyrillic"],
  axes: ["FLAR", "VOLM"],
  variable: "--font-commissioner",
  display: "swap",
});
