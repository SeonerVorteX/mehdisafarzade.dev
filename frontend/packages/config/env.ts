import { z } from "zod";

/**
 * Environment shared by both apps, validated once at module load. App-specific
 * values live in each app's own `src/config/env.ts`: web must never learn the
 * admin hostname (it would be inlined into the public bundle), and admin has no
 * use for web-only keys like the Turnstile site key.
 *
 * `INTERNAL_API_URL` is deliberately not NEXT_PUBLIC_*: it is the Docker-network
 * route for server-side fetches (same idea as `@examination/config/env.ts`) and
 * must stay out of the client bundle.
 *
 * Next only inlines `process.env.NEXT_PUBLIC_X` when referenced literally, so
 * each key is spelled out rather than passing `process.env` wholesale.
 */
export const url = z.url();

export function parseEnv<S extends z.ZodType>(schema: S, input: Record<string, unknown>, testDefaults: z.input<S>) {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data as z.output<S>;
  // vitest / eslint import these modules without any .env; fall back to local
  // dev defaults there. `next build` / `next start` always validate for real.
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return schema.parse(testDefaults) as z.output<S>;
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Invalid environment: ${issues}. See the app's .env.example.`);
}

const SharedEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: url,
});

const sharedEnv = parseEnv(
  SharedEnvSchema,
  { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL },
  { NEXT_PUBLIC_API_URL: "http://localhost:3100/v1" },
);

/** Public API base including the version prefix, e.g. `https://api.mehdisafarzade.dev/v1`. */
export const API_URL = sharedEnv.NEXT_PUBLIC_API_URL.replace(/\/$/, "");

/** Server-only: Docker-network base URL for SSR fetches (`http://portfolio-api:3000/v1`). Unset in local dev. */
export const INTERNAL_API_URL =
  typeof window === "undefined" ? process.env.INTERNAL_API_URL?.replace(/\/$/, "") || undefined : undefined;

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
