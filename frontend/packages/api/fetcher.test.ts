import { afterEach, describe, expect, it, vi } from "vitest";
import { APIError, fetchJSON } from "./fetcher";

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));
}

afterEach(() => vi.restoreAllMocks());

describe("fetchJSON", () => {
  it("unwraps a success envelope", async () => {
    mockFetch(200, { ok: true, data: { a: 1 }, locale: "en" });
    await expect(fetchJSON<{ a: number }>("/x", { baseUrl: "http://api" })).resolves.toEqual({
      ok: true,
      data: { a: 1 },
      locale: "en",
    });
  });

  it("throws APIError carrying the envelope errors", async () => {
    mockFetch(400, {
      ok: false,
      locale: "az",
      errors: [{ code: "NOT_EMPTY", message: "Boş ola bilməz", scope: "validation", field: "email" }],
    });
    const err = await fetchJSON("/x", { baseUrl: "http://api" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(APIError);
    expect((err as APIError).status).toBe(400);
    expect((err as APIError).hasCode("NOT_EMPTY")).toBe(true);
  });

  it("rejects a 200 that is not an envelope", async () => {
    mockFetch(200, "<html>proxy error</html>");
    await expect(fetchJSON("/x", { baseUrl: "http://api" })).rejects.toThrow(/invalid envelope/);
  });

  it("maps a network failure to 503 NETWORK_ERROR", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    const err = (await fetchJSON("/x", { baseUrl: "http://api" }).catch((e: unknown) => e)) as APIError;
    expect(err.status).toBe(503);
    expect(err.errors[0]?.code).toBe("NETWORK_ERROR");
  });
});
