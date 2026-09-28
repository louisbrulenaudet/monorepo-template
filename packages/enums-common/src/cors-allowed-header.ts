export const CorsAllowedHeader = {
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
  SENTRY_TRACE: "sentry-trace",
  BAGGAGE: "baggage",
} as const;

export type CorsAllowedHeader =
  (typeof CorsAllowedHeader)[keyof typeof CorsAllowedHeader];

export const CORS_ALLOWED_HEADERS: readonly CorsAllowedHeader[] =
  Object.values(CorsAllowedHeader);

export const CorsExposedHeader = {
  /**
   * Opaque UUID minted by the gateway per request. Never a user or tenant
   * identifier.
   */
  X_REQUEST_ID: "X-Request-Id",
  X_WORKER_VERSION_ID: "X-Worker-Version-Id",
} as const;

export type CorsExposedHeader =
  (typeof CorsExposedHeader)[keyof typeof CorsExposedHeader];

export const CORS_EXPOSED_HEADERS: readonly CorsExposedHeader[] =
  Object.values(CorsExposedHeader);
