import { createHmac, timingSafeEqual } from "node:crypto";

/** Same scheme as the API's `signRevalidation`: HMAC-SHA256 hex over `${timestamp}.${body}`. */
export function signRevalidation(body: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export const REVALIDATE_WINDOW_S = 5 * 60;
const TAG = /^[a-z][a-z0-9-]*(:[A-Za-z0-9_-]{1,64})?$/;

export type RevalidateCheck = { ok: true; tags: string[] } | { ok: false; status: 400 | 401 };

/**
 * Verifies a webhook from the API. Anything unsigned, stale (±5 min) or malformed
 * is refused before any tag is touched. Tags are the API's cache tags
 * (`posts`, `post:<id>`, `all`, …) and must match a strict shape.
 */
export function verifyRevalidation(
  body: string,
  headers: { timestamp: string | null; signature: string | null },
  secret: string | undefined,
  nowS = Math.floor(Date.now() / 1000),
): RevalidateCheck {
  const { timestamp, signature } = headers;
  if (!secret || !timestamp || !signature) return { ok: false, status: 401 };
  if (!/^\d{1,12}$/.test(timestamp) || Math.abs(nowS - Number(timestamp)) > REVALIDATE_WINDOW_S) {
    return { ok: false, status: 401 };
  }
  if (!/^[0-9a-f]{64}$/.test(signature)) return { ok: false, status: 401 };
  const expected = Buffer.from(signRevalidation(body, timestamp, secret), "hex");
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return { ok: false, status: 401 };

  let tags: unknown;
  try {
    tags = (JSON.parse(body) as { tags?: unknown }).tags;
  } catch {
    return { ok: false, status: 400 };
  }
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > 100) return { ok: false, status: 400 };
  if (!tags.every((t): t is string => typeof t === "string" && TAG.test(t))) return { ok: false, status: 400 };
  return { ok: true, tags: [...new Set(tags)] };
}
