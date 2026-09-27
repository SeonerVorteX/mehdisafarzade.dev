import { describe, expect, it } from "vitest";
import { resolveTheme, THEME_SCRIPT, themeCookie } from "./theme";

function runScript(cookie: string, prefersDark: boolean) {
  const attrs: Record<string, string> = {};
  const document = { cookie, documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } };
  const window = { matchMedia: () => ({ matches: prefersDark }) };
  new Function("document", "window", THEME_SCRIPT)(document, window);
  return attrs;
}

describe("THEME_SCRIPT", () => {
  it.each([
    ["", false, "light", "system"],
    ["", true, "dark", "system"],
    ["theme=dark", false, "dark", "dark"],
    ["a=1; theme=light", true, "light", "light"],
    ["theme=system; b=2", true, "dark", "system"],
    ["theme=purple", true, "dark", "system"],
    ["xtheme=dark", false, "light", "system"],
  ])("cookie %j, prefers dark %s → %s (pref %s)", (cookie, dark, theme, pref) => {
    expect(runScript(cookie, dark)).toEqual({ "data-theme": theme, "data-theme-pref": pref });
  });

  it("never throws (e.g. matchMedia missing)", () => {
    const document = { cookie: "", documentElement: { setAttribute: () => undefined } };
    expect(() => new Function("document", "window", THEME_SCRIPT)(document, {})).not.toThrow();
  });
});

describe("theme helpers", () => {
  it("resolves the preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("builds the cookie", () => {
    expect(themeCookie("dark")).toBe("theme=dark; Path=/; Max-Age=31536000; SameSite=Lax");
    expect(themeCookie("light", { domain: ".example.com", secure: true })).toContain("Domain=.example.com; Secure");
  });
});
