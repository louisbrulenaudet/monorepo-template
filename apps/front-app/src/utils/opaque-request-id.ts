/** UUID v4 shape only — refuse privileged-looking correlation values. */
const OPAQUE_REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STORAGE_KEY = "opaque-request-id";

export function isOpaqueRequestId(value: string): boolean {
  return OPAQUE_REQUEST_ID.test(value);
}

/**
 * Stable opaque id for this browser tab session. Used as `X-Request-Id` on
 * worker-api calls so SPA and gateway logs correlate without privileged data.
 */
export function getOrCreateOpaqueRequestId(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("crypto.randomUUID is required for opaque request ids");
  }

  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing && isOpaqueRequestId(existing)) {
      return existing;
    }
    const created = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    // Private mode / blocked storage: still correlate within this JS realm.
    return crypto.randomUUID();
  }
}
