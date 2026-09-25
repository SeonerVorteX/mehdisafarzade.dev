/** Seconds until a JWT's `exp` (no verification: only used to decide whether to refresh early). */
export function jwtSecondsLeft(token: string | undefined, nowMs = Date.now()): number {
  if (!token) return -1;
  const payload = token.split(".")[1];
  if (!payload) return -1;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp - Math.floor(nowMs / 1000) : -1;
  } catch {
    return -1;
  }
}

/** Only same-app relative paths are allowed as a post-login destination (no open redirect). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.startsWith("/login")) {
    return "/";
  }
  return next;
}

/** Reads `name=value` pairs out of a Set-Cookie list (for re-injecting refreshed cookies into the request). */
export function cookiePairs(setCookies: string[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const line of setCookies) {
    const [pair] = line.split(";");
    const eq = pair?.indexOf("=") ?? -1;
    if (!pair || eq < 1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    out[name] = /max-age=0|expires=thu, 01 jan 1970/i.test(line) || value === "" ? null : value;
  }
  return out;
}
