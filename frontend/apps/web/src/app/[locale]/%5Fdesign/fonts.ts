import { Instrument_Serif } from "next/font/google";

/** Candidate B, loaded only on the style tile. Latin + latin-ext only (no Cyrillic in the family). */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});
