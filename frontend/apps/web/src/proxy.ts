import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Locale routing. Lives at `src/proxy.ts` (not `src/app/proxy.ts`): Next only
 * picks the proxy up next to `app/`. CSP nonces and security headers are added
 * here in Phase 6.
 */
export default createMiddleware(routing);

export const config = {
  // Everything except Next internals, route handlers under /api, and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
