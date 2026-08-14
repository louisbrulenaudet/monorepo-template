/**
 * UUID v4 shape only — refuse privileged-looking correlation values. Keep in
 * sync with apps/worker-api/src/utils/opaque-request-id.ts.
 */
const OPAQUE_REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STORAGE_KEY = "opaque-request-id";

/** In-memory cache so we skip sessionStorage I/O after the first resolve. */
let cachedId: string | null = null;

export function isOpaqueRequestId(value: string): boolean {
  return OPAQUE_REQUEST_ID.test(value);
}

/**
 * Clears the in-memory cache. Used by tests when sessionStorage is stubbed
 * fresh between cases.
 */
export function resetOpaqueRequestIdCache(): void {
  cachedId = null;
}

/**
 * Stable opaque id for this browser tab session. Used as `X-Request-Id` on
 * worker-api calls so SPA and gateway logs correlate without privileged data.
 */
export function getOrCreateOpaqueRequestId(): string {
  if (cachedId !== null) {
    return cachedId;
  }

  if (
    typeof crypto === "undefined" ||
    typeof crypto.randomUUID !== "function"
  ) {
    throw new Error("crypto.randomUUID is required for opaque request ids");
  }

  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing && isOpaqueRequestId(existing)) {
      cachedId = existing;
      return existing;
    }
    const created = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, created);
    cachedId = created;
    return created;
  } catch {
    // Private mode / blocked storage: still correlate within this JS realm.
    cachedId = crypto.randomUUID();
    return cachedId;
  }
}
