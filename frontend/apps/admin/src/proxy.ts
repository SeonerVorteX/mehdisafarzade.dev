import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminPaths } from "@portfolio/api/admin";
import { API_URL, INTERNAL_API_URL } from "@portfolio/config";
import { ADMIN_URL } from "@/config/env";
import { cookiePairs, jwtSecondsLeft } from "@/lib/session";

/**
 * Admin route guard (brief §7: proxy.ts guards all routes). Lives at src/proxy.ts; Next
 * ignores a proxy at src/app/proxy.ts (the Examination admin/app placement issue).
 *
 * The device gate has already run in nginx before any request gets here. This only
 * decides "signed in or not":
 *  - /login* is public (and bounces to / when a live session exists)
 *  - a live access token → continue
 *  - access expired/expiring but a refresh cookie exists → refresh server-side, pass
 *    the new cookies to both the browser and this render
 *  - otherwise → /login?next=<path>
 */
const REFRESH_EARLY_S = 30;

async function refreshSession(req: NextRequest): Promise<string[] | null> {
  const refresh = req.cookies.get(ADMIN_COOKIE.REFRESH)?.value;
  const device = req.headers.get("x-admin-device");
  if (!refresh || !device) return null;
  try {
    const res = await fetch(`${INTERNAL_API_URL ?? API_URL}/admin${adminPaths.auth.refresh}`, {
      method: "POST",
      headers: {
        cookie: `${ADMIN_COOKIE.REFRESH}=${refresh}`,
        "x-admin-device": device,
        "x-real-ip": req.headers.get("x-real-ip") ?? "",
        origin: ADMIN_URL,
        "user-agent": req.headers.get("user-agent") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.headers.getSetCookie();
  } catch {
    return null;
  }
}

function toLogin(req: NextRequest, reason?: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const next = req.nextUrl.pathname + req.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  if (reason) url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const access = req.cookies.get(ADMIN_COOKIE.ACCESS)?.value;
  const hasRefresh = req.cookies.has(ADMIN_COOKIE.REFRESH);
  const live = jwtSecondsLeft(access) > REFRESH_EARLY_S;

  if (pathname.startsWith("/login")) {
    return live ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }
  if (live) return NextResponse.next();
  if (!hasRefresh) return toLogin(req);

  const setCookies = await refreshSession(req);
  if (!setCookies) return toLogin(req, "sessionExpired");

  // Make the refreshed cookies visible to this very render…
  const pairs = cookiePairs(setCookies);
  const merged = new Map(req.cookies.getAll().map((c) => [c.name, c.value]));
  for (const [name, value] of Object.entries(pairs)) {
    if (value === null) merged.delete(name);
    else merged.set(name, value);
  }
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("cookie", [...merged].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  // …and store them in the browser.
  for (const line of setCookies) res.headers.append("set-cookie", line);
  return res;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|api/).*)"],
};
