// Shared ESLint 9 flat config for every frontend workspace.
// Apps:     `export default nextConfig({ extra })`
// Packages: `export default packageConfig()`
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const ignores = {
  ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/coverage/**", "**/next-env.d.ts"],
};

const sharedRules = {
  rules: {
    // `any` is allowed only with an explanatory eslint-disable comment (brief §8).
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
};

export function packageConfig(...extra) {
  return tseslint.config(ignores, ...tseslint.configs.recommended, sharedRules, prettier, ...extra);
}

export function nextConfig(...extra) {
  return [ignores, ...nextVitals, ...nextTs, sharedRules, prettier, ...extra];
}

export default packageConfig();
