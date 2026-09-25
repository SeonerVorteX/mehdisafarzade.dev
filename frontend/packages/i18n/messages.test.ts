import { describe, expect, it } from "vitest";
import { deepMerge, loadAdminMessages, loadWebMessages } from "./messages";

describe("deepMerge", () => {
  it("lets the override win and keeps fallback-only keys", () => {
    expect(deepMerge({ a: "1", n: { b: "2", c: "3" } }, { n: { b: "x" } })).toEqual({ a: "1", n: { b: "x", c: "3" } });
  });
});

describe("message loading", () => {
  it("layers the requested web locale over en", async () => {
    const ru = await loadWebMessages("ru");
    expect((ru.notFound as Record<string, string>).home).toBe("На главную");
    expect((ru.common as Record<string, string>).siteName).toBe("Мехди Сафарзаде");
  });

  it("loads admin messages with the shared global bundle", async () => {
    const az = await loadAdminMessages("az");
    expect((az.meta as Record<string, string>).title).toBe("İdarəetmə");
    expect(az.theme).toBeDefined();
  });
});
