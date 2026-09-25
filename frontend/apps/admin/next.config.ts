import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const uiStyles = path.resolve(import.meta.dirname, "../../packages/ui/styles");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@portfolio/ui", "@portfolio/i18n", "@portfolio/config", "@portfolio/api"],
  turbopack: {
    resolveAlias: {
      "@portfolio/ui/styles": uiStyles,
    },
  },
  sassOptions: {
    loadPaths: [uiStyles],
  },
  async headers() {
    return [
      {
        // Never cacheable anywhere (Cloudflare, browser, proxies): the panel sits behind
        // the device gate and a cached copy could be served to someone the gate would stop.
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
