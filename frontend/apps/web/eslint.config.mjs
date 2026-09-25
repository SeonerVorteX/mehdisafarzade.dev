import { nextConfig } from "@portfolio/config/eslint";

export default nextConfig({
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "next/link",
            importNames: ["default"],
            message: "Import Link from '@/i18n/navigation' so the locale prefix is kept.",
          },
          {
            name: "@portfolio/api/admin",
            message: "Admin code must never reach the public web bundle (brief §2).",
          },
        ],
        patterns: [{ group: ["@portfolio/*/admin", "@portfolio/*/admin/*"], message: "Admin-only module." }],
      },
    ],
  },
});
