import { z } from "zod";
import { parseEnv, url } from "@portfolio/config";

/**
 * Admin-only environment. The browser always talks to the same-origin `/api`
 * proxy (nginx → portfolio-api `/v1/admin/*`, behind the device gate); server
 * components use `INTERNAL_API_URL` + `/admin` directly over the Docker network.
 */
const AdminEnvSchema = z.object({
  NEXT_PUBLIC_ADMIN_URL: url,
  NEXT_PUBLIC_SITE_URL: url,
});

const env = parseEnv(
  AdminEnvSchema,
  {
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  { NEXT_PUBLIC_ADMIN_URL: "https://localhost:8443", NEXT_PUBLIC_SITE_URL: "http://localhost:5600" },
);

export const ADMIN_URL = env.NEXT_PUBLIC_ADMIN_URL.replace(/\/$/, "");
export const SITE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
/** Browser-side base for admin API calls (same origin, proxied by the gate). */
export const ADMIN_API_BASE = "/api";
