export const CorsAllowedHeader = {
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
  /** Opaque correlation id (UUID). Never a client/matter identifier. */
  X_REQUEST_ID: "X-Request-Id",
} as const;

export type CorsAllowedHeader =
  (typeof CorsAllowedHeader)[keyof typeof CorsAllowedHeader];

export const CORS_ALLOWED_HEADERS: readonly CorsAllowedHeader[] = [
  CorsAllowedHeader.CONTENT_TYPE,
  CorsAllowedHeader.AUTHORIZATION,
  CorsAllowedHeader.X_REQUEST_ID,
];
