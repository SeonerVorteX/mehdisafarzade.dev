/**
 * Request/response types shared with `api/` (hand-maintained, Examination style).
 * From Phase 4 an API e2e test snapshots the OpenAPI schema so contract drift fails CI.
 */
export type HealthResponse = { status: "ok"; timestamp: string };
