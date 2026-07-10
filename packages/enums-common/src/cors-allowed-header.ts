export const CorsAllowedHeader = {
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
} as const;

export type CorsAllowedHeader =
  (typeof CorsAllowedHeader)[keyof typeof CorsAllowedHeader];

export const CORS_ALLOWED_HEADERS: readonly CorsAllowedHeader[] = [
  "Content-Type",
  "Authorization",
];
