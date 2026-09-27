import { describe, expect, it } from "vitest";
import { pickMessages } from "./clientMessages";

describe("pickMessages", () => {
  it("keeps only the requested namespaces", () => {
    const all = { theme: { dark: "Dark" }, design: { title: "Style tile" }, meta: { title: "x" } };
    expect(pickMessages(all, ["theme", "missing"])).toEqual({ theme: { dark: "Dark" } });
  });
});
