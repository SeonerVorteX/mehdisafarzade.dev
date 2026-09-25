import { fetchJSON, type Envelope, type FetcherOptions } from "./fetcher";

type RequestOptions = Omit<FetcherOptions, "body">;

/** Mutations (POST by default). Sends cookies unless told otherwise, like Examination's `apiRequest`. */
export function apiRequest<TRes = { message: string }, TBody = unknown>(
  path: string,
  body?: TBody,
  opts: RequestOptions = {},
): Promise<Envelope<TRes>> {
  return fetchJSON<TRes>(path, { method: "POST", credentials: "include", ...opts, body });
}
