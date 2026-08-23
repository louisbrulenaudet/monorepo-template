import { isOpaqueCorrelationId } from "@repo/correlation-id";

const STORAGE_KEY = "correlation-id";

/** In-memory cache so we skip sessionStorage I/O after the first resolve. */
let cachedId: string | null = null;

/**
 * Re-exported for unit tests; production code uses the internal import.
 *
 * @internal
 */
export { isOpaqueCorrelationId };

/**
 * Clears the in-memory cache. Used by tests when sessionStorage is stubbed
 * fresh between cases.
 *
 * @internal
 */
export function resetCorrelationIdCache(): void {
  cachedId = null;
}

/**
 * Stable opaque id for this browser tab session. Sent as `X-Request-Id` on
 * worker-api calls so SPA and gateway logs correlate without privileged data.
 */
export function getOrCreateCorrelationId(): string {
  if (cachedId !== null) {
    return cachedId;
  }

  if (
    typeof crypto === "undefined" ||
    typeof crypto.randomUUID !== "function"
  ) {
    throw new Error("crypto.randomUUID is required for correlation ids");
  }

  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing && isOpaqueCorrelationId(existing)) {
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
