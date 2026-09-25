"use client";

import { APIError, fetchJSON, type Envelope } from "@portfolio/api";
import { ADMIN_COOKIE, adminPaths } from "@portfolio/api/admin";
import { ADMIN_API_BASE } from "@/config/env";

function readCookie(name: string): string | undefined {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time per tab; concurrent 401s wait for the same attempt. */
function refreshOnce(): Promise<boolean> {
  refreshing ??= fetchJSON(adminPaths.auth.refresh, { method: "POST", baseUrl: ADMIN_API_BASE, credentials: "same-origin" })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0);
    });
  return refreshing;
}

type Options = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; retry?: boolean };

/**
 * Browser → same-origin `/api` (nginx gate → /v1/admin). Sends the double-submit CSRF
 * header on mutations, and on an expired access token refreshes once and retries.
 * If that fails, the caller gets the APIError (pages redirect to /login).
 */
export async function adminFetch<T>(path: string, { method = "GET", body, retry = true }: Options = {}): Promise<Envelope<T>> {
  const csrf = method === "GET" ? undefined : readCookie(ADMIN_COOKIE.CSRF);
  try {
    return await fetchJSON<T>(path, {
      method,
      body,
      baseUrl: ADMIN_API_BASE,
      credentials: "same-origin",
      headers: { "X-CSRF-Token": csrf },
      cache: "no-store",
    });
  } catch (err) {
    const expired = err instanceof APIError && err.status === 401 && !path.startsWith("/auth/");
    if (retry && expired && (await refreshOnce())) return adminFetch<T>(path, { method, body, retry: false });
    throw err;
  }
}
