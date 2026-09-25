import { z } from "zod";
import { API_URL, INTERNAL_API_URL } from "@portfolio/config";

/**
 * Response envelope + fetch wrapper, mirroring `@examination/api/fetcher.ts`:
 * success is `{ ok: true, data, locale }`, failure is `{ ok: false, errors[], locale }`
 * and is thrown as `APIError`. Differences from Examination: the base URL is
 * pluggable (the admin app talks to its same-origin `/api` proxy, not the public
 * API host), and there are no `any` casts.
 */
export type FetcherOptions = {
  method?: RequestInit["method"];
  body?: unknown;
  headers?: Record<string, string | undefined>;
  signal?: AbortSignal;
  next?: { revalidate?: number | false; tags?: string[] };
  credentials?: RequestCredentials;
  cache?: RequestCache;
  /** Overrides base URL resolution (e.g. the admin app's `/api`). */
  baseUrl?: string;
  timeoutMs?: number;
};

const ErrorItemSchema = z.object({
  code: z.string(),
  message: z.string(),
  scope: z.enum(["domain", "validation"]),
  field: z.string().optional(),
  fields: z.union([z.string(), z.array(z.string())]).optional(),
});

const SuccessEnvelopeSchema = z.object({ ok: z.literal(true), data: z.unknown(), locale: z.string() });
const FailEnvelopeSchema = z.object({ ok: z.literal(false), errors: z.array(ErrorItemSchema), locale: z.string() });
const EnvelopeSchema = z.union([SuccessEnvelopeSchema, FailEnvelopeSchema]);

export type APIErrorItem = z.infer<typeof ErrorItemSchema>;

export class APIError extends Error {
  status?: number;
  locale?: string;
  errors: APIErrorItem[];
  constructor(message: string, opts?: { status?: number; locale?: string; errors?: APIErrorItem[] }) {
    super(message);
    this.name = "APIError";
    this.status = opts?.status;
    this.locale = opts?.locale;
    this.errors = opts?.errors ?? [];
  }

  hasCode(code: string): boolean {
    return this.errors.some((e) => e.code === code);
  }
}

export type Envelope<T> = { ok: true; data: T; locale: string };

function resolveBaseUrl(override?: string): string {
  if (override !== undefined) return override;
  const isServer = typeof window === "undefined";
  return isServer && INTERNAL_API_URL ? INTERNAL_API_URL : API_URL;
}

export async function fetchJSON<T>(endpoint: string, opts: FetcherOptions = {}): Promise<Envelope<T>> {
  const { method = "GET", body, headers, next, cache, credentials, baseUrl, timeoutMs = 30_000 } = opts;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const cleanHeaders: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined && !isForm) cleanHeaders["Content-Type"] = "application/json";
  for (const [k, v] of Object.entries(headers ?? {})) if (v !== undefined) cleanHeaders[k] = v;

  const timeout = new AbortController();
  const timeoutId = setTimeout(() => timeout.abort(), timeoutMs);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout.signal]) : timeout.signal;

  const url = endpoint.startsWith("http") ? endpoint : resolveBaseUrl(baseUrl) + endpoint;
  const init: RequestInit & { next?: FetcherOptions["next"] } = {
    method,
    headers: cleanHeaders,
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    credentials,
    cache,
    signal,
  };
  if (typeof window === "undefined" && next) init.next = next;

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new APIError("Network error or request was aborted", {
      status: 503,
      errors: [{ code: "NETWORK_ERROR", message: "intl:errors.serverUnavailable", scope: "domain" }],
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text().catch(() => "");
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined;
  }

  const env = EnvelopeSchema.safeParse(parsed);
  if (!env.success) {
    throw new APIError(
      res.ok ? "API response validation failed (invalid envelope)" : `API ${res.status}: ${res.statusText}`,
      { status: res.status },
    );
  }
  if (!env.data.ok) {
    throw new APIError(env.data.errors.map((x) => x.message).join("; ") || "API returned an error", {
      status: res.status,
      locale: env.data.locale,
      errors: env.data.errors,
    });
  }
  return { ok: true, data: env.data.data as T, locale: env.data.locale };
}

export async function fetchParsed<S extends z.ZodType>(
  endpoint: string,
  schema: S,
  opts?: FetcherOptions,
): Promise<Envelope<z.output<S>>> {
  const { data, locale } = await fetchJSON<unknown>(endpoint, opts);
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new APIError("API response validation failed (data shape mismatch)");
  return { ok: true, data: parsed.data, locale };
}
