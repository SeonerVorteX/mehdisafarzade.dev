import { describe, expect, it } from "vitest";
import { signRevalidation, verifyRevalidation } from "./revalidate";

const SECRET = "test-secret-test-secret-test-secret";
const now = 1_800_000_000;
const signed = (body: string, ts = String(now), secret = SECRET) => ({
  timestamp: ts,
  signature: signRevalidation(body, ts, secret),
});

describe("verifyRevalidation", () => {
  const body = JSON.stringify({ tags: ["posts", "post:abc123", "posts"] });

  it("accepts a valid, fresh signature and dedupes tags", () => {
    expect(verifyRevalidation(body, signed(body), SECRET, now)).toEqual({ ok: true, tags: ["posts", "post:abc123"] });
  });

  it("matches the API's signing scheme (shared test vector)", () => {
    // The same vector is asserted in api/src/common/helpers/revalidation/revalidation.service.spec.ts.
    expect(signRevalidation('{"tags":["posts"]}', "1800000000", SECRET)).toBe(
      "6808efcc46b89e0bf8d63e08520e17b4d3d91b0f0077d0650adbc4cd0d8a494c",
    );
  });

  it.each([
    ["no secret configured", body, signed(body), undefined],
    ["missing headers", body, { timestamp: null, signature: null }, SECRET],
    ["wrong secret", body, signed(body, String(now), "other-secret"), SECRET],
    ["stale timestamp", body, signed(body, String(now - 301)), SECRET],
    ["future timestamp", body, signed(body, String(now + 301)), SECRET],
    ["tampered body", body.replace("posts", "pages"), signed(body), SECRET],
    ["non-hex signature", body, { timestamp: String(now), signature: "z".repeat(64) }, SECRET],
  ])("rejects %s with 401", (_name, b, h, secret) => {
    expect(verifyRevalidation(b, h, secret, now)).toEqual({ ok: false, status: 401 });
  });

  it.each([
    ["invalid JSON", "{nope"],
    ["no tags", JSON.stringify({})],
    ["empty tags", JSON.stringify({ tags: [] })],
    ["bad tag shape", JSON.stringify({ tags: ["../etc"] })],
    ["non-string tag", JSON.stringify({ tags: [1] })],
  ])("rejects %s with 400 (after the signature checks)", (_name, b) => {
    expect(verifyRevalidation(b, signed(b), SECRET, now)).toEqual({ ok: false, status: 400 });
  });
});
