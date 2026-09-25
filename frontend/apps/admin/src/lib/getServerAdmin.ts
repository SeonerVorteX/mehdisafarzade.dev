import "server-only";
import { cookies, headers } from "next/headers";
import { APIError, fetchJSON } from "@portfolio/api";
import { API_URL, INTERNAL_API_URL } from "@portfolio/config";
import { adminPaths, type AdminMe, type AdminSessionInfo } from "@portfolio/api/admin";

/**
 * Server-side admin API calls (Examination's getServer* pattern). Goes straight to the
 * API over the Docker network (INTERNAL_API_URL), forwarding the session cookies and
 * the X-Admin-Device header that nginx set for this request after the device gate.
 * Returns null on 401/404 (the caller redirects to /login).
 */
async function adminServerGet<T>(path: string): Promise<T | null> {
  const h = await headers();
  const device = h.get("x-admin-device") ?? undefined;
  const cookie = (await cookies()).toString();
  const base = `${INTERNAL_API_URL ?? API_URL}/admin`;
  try {
    const { data } = await fetchJSON<T>(path, {
      baseUrl: base,
      cache: "no-store",
      headers: { cookie, "x-admin-device": device, "user-agent": h.get("user-agent") ?? undefined },
    });
    return data;
  } catch (err) {
    if (err instanceof APIError && (err.status === 401 || err.status === 404)) return null;
    throw err;
  }
}

export function getServerMe() {
  return adminServerGet<AdminMe>(adminPaths.auth.me);
}

export function getServerSessions() {
  return adminServerGet<AdminSessionInfo[]>(adminPaths.auth.sessions);
}
