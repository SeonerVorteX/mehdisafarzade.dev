import { describe, expect, it } from "vitest";
import { routing } from "./routing";

describe("web routing", () => {
  it("always prefixes the locale and defaults to en", () => {
    expect(routing.localePrefix).toBe("always");
    expect(routing.defaultLocale).toBe("en");
    expect([...routing.locales].sort()).toEqual(["az", "en", "ru"]);
  });

  it("stores the choice in the shared preferredLang cookie", () => {
    expect(routing.localeCookie).toMatchObject({ name: "preferredLang" });
  });
});
