/**
 * UUID v4 only — refuse privileged-looking correlation values (matter ids,
 * client names, etc.). Wire header remains `X-Request-Id`.
 */
const OPAQUE_CORRELATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOpaqueCorrelationId(value: string): boolean {
  return OPAQUE_CORRELATION_ID.test(value);
}

function randomUuid(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  if (typeof webCrypto?.randomUUID !== "function") {
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
