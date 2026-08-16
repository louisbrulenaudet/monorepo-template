/**
 * UUID v4 only — refuse privileged-looking correlation values (matter ids,
 * client names, etc.). Wire header remains `X-Request-Id`.
 */
const OPAQUE_CORRELATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOpaqueCorrelationId(value: string): boolean {
  return OPAQUE_CORRELATION_ID.test(value);
}

/** Narrow `globalThis.crypto` without DOM lib (library stays runtime-neutral). */
function hasRandomUuid(value: unknown): value is { randomUUID: () => string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "randomUUID" in value &&
    typeof value.randomUUID === "function"
  );
}

function randomUuid(): string {
  const webCrypto: unknown = Reflect.get(globalThis, "crypto");
  if (!hasRandomUuid(webCrypto)) {
    throw new Error("crypto.randomUUID is required for correlation ids");
  }
  return webCrypto.randomUUID();
}

/** Accept a client-supplied opaque id, or mint a new UUID v4. */
export function resolveCorrelationId(incoming: string | undefined): string {
  if (incoming && isOpaqueCorrelationId(incoming)) {
    return incoming;
  }
  return randomUuid();
}
