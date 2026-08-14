/**
 * UUID v4 shape only — refuse privileged-looking correlation values. Keep in
 * sync with apps/front-app/src/utils/opaque-request-id.ts.
 */
const OPAQUE_REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOpaqueRequestId(value: string): boolean {
  return OPAQUE_REQUEST_ID.test(value);
}

export function resolveOpaqueRequestId(incoming: string | undefined): string {
  if (incoming && isOpaqueRequestId(incoming)) {
    return incoming;
  }
  return crypto.randomUUID();
}
