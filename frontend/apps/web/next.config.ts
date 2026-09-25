import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const uiStyles = path.resolve(import.meta.dirname, "../../packages/ui/styles");

const nextConfig: NextConfig = {
  output: "standalone",
  // Standalone tracing must see the whole workspace so hoisted deps are copied.
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
};

export default withNextIntl(nextConfig);
