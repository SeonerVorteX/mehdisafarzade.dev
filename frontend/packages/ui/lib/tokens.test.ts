import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

/** Reads the real tokens from root.scss, so a colour edit that breaks AA fails CI. */
const scss = readFileSync(join(import.meta.dirname, "..", "styles", "root.scss"), "utf8");

function block(name: string): Record<string, string> {
  const m = scss.match(new RegExp(`@mixin ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!m?.[1]) throw new Error(`mixin ${name} not found`);
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})/gi)].map((x) => [x[1], x[2]]));
}

function get(tokens: Record<string, string>, key: string): string {
  const v = tokens[key];
  if (!v) throw new Error(`token --${key} missing`);
  return v;
}

const themes = { light: block("light-tokens"), dark: block("dark-tokens") };
const accents = (["light", "dark"] as const).map((theme) => ({ name: "accent", theme, tokens: block(`accent-${theme}`) }));

describe("design tokens meet WCAG AA", () => {
  it.each(Object.entries(themes))("%s: text colours on every surface", (_theme, t) => {
    for (const surface of ["color-bg", "color-bg-elevated", "color-bg-sunken"]) {
      for (const text of ["color-fg", "color-fg-secondary", "color-muted"]) {
        const ok = contrastRatio(get(t, text), get(t, surface)) >= 4.5;
        expect({ surface, text, ok }).toEqual({ surface, text, ok: true });
      }
    }
  });

  it.each(accents)("$name/$theme: text on the accent fill and accent text on backgrounds", (a) => {
    const t = themes[a.theme];
    const k = a.tokens;
    expect(contrastRatio(get(k, "color-accent-fg"), get(k, "color-accent"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(get(k, "color-accent-text"), get(t, "color-bg"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(get(k, "color-accent-text"), get(t, "color-bg-elevated"))).toBeGreaterThanOrEqual(4.5);
  });
});
