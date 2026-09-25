import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names", () => {
    const off = false;
    expect(cn("a", off && "b", { c: true, d: false }, ["e"])).toBe("a c e");
  });
});
