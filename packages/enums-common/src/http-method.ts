export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  OPTIONS: "OPTIONS",
} as const;

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const CORS_ALLOWED_HTTP_METHODS: readonly HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

const HTTP_METHOD_LOOKUP = new Map<string, HttpMethod>(
  Object.values(HttpMethod).map((method) => [method, method]),
);

const UNSAFE_HTTP_METHODS = new Set<HttpMethod>([
  HttpMethod.POST,
  HttpMethod.PUT,
  HttpMethod.PATCH,
  HttpMethod.DELETE,
]);

export function parseHttpMethod(method: string): HttpMethod | undefined {
  return HTTP_METHOD_LOOKUP.get(method.toUpperCase());
}

export function isUnsafeHttpMethod(method: HttpMethod): boolean {
  return UNSAFE_HTTP_METHODS.has(method);
}
