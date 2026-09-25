import { describe, expect, it } from "vitest";
import { cookiePairs, jwtSecondsLeft, safeNextPath } from "./session";

const jwt = (exp: number) => `h.${btoa(JSON.stringify({ exp })).replace(/=+$/, "")}.s`;

describe("jwtSecondsLeft", () => {
  it("reads exp", () => {
    expect(jwtSecondsLeft(jwt(1_000 + 120), 1_000_000)).toBe(120);
  });
  it("is negative for missing or garbage tokens", () => {
    expect(jwtSecondsLeft(undefined)).toBe(-1);
    expect(jwtSecondsLeft("nope")).toBe(-1);
    expect(jwtSecondsLeft("a.%%%.b")).toBe(-1);
  });
});

describe("safeNextPath", () => {
  it.each([
    [null, "/"],
    ["/posts?x=1", "/posts?x=1"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["/login/totp", "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("cookiePairs", () => {
  it("extracts values and marks cleared cookies", () => {
    expect(
      cookiePairs([
        "__Host-pf_at=abc; Path=/; HttpOnly; Secure; SameSite=Strict",
        "__Host-pf_rt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      ]),
    ).toEqual({ "__Host-pf_at": "abc", "__Host-pf_rt": null });
  });
});
