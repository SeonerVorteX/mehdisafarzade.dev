import { z } from "zod";
import { parseEnv, url } from "@portfolio/config";

/** Web-only environment. Never add admin values here: they would ship in the public bundle. */
const WebEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: url,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CF_BEACON_TOKEN: z.string().min(1).optional(),
});

const env = parseEnv(
  WebEnvSchema,
  {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
    NEXT_PUBLIC_CF_BEACON_TOKEN: process.env.NEXT_PUBLIC_CF_BEACON_TOKEN || undefined,
  },
  { NEXT_PUBLIC_SITE_URL: "http://localhost:5600" },
);

export const SITE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
export const TURNSTILE_SITE_KEY = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const CF_BEACON_TOKEN = env.NEXT_PUBLIC_CF_BEACON_TOKEN;
