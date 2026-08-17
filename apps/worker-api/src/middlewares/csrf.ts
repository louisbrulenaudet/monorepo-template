import type { RequestIdVariables } from "hono/request-id";
import {
  HttpMethod,
  isUnsafeHttpMethod,
  parseHttpMethod,
} from "@repo/enums-common";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { resolveCorsOrigins } from "./cors-origins";

type AppEnv = {
  Bindings: Env;
  Variables: RequestIdVariables;
};

const SEC_FETCH_SITE_VALUES = [
  "same-origin",
  "same-site",
  "none",
  "cross-site",
] as const;

type SecFetchSite = (typeof SEC_FETCH_SITE_VALUES)[number];

function isSecFetchSite(value: string): value is SecFetchSite {
  return (SEC_FETCH_SITE_VALUES as readonly string[]).includes(value);
}

function isAllowedSecFetchSite(value: string | undefined): boolean {
  if (value === undefined || !isSecFetchSite(value)) {
    return false;
  }
  // same-origin / same-site: first-party navigations and same-site SPAs.
  // "none" is not accepted: browser fetch from another site is cross-site;
  // non-browser clients must send a trusted Origin when an allowlist is set.
  return value === "same-origin" || value === "same-site";
}

function isAllowedOrigin(
  origin: string | undefined,
  allowedOrigins: string[] | null,
): boolean {
  if (origin === undefined) {
    return false;
  }
  // Permissive mode (dev with empty CORS_ORIGINS): any Origin is fine.
  if (allowedOrigins === null) {
    return true;
  }
  return allowedOrigins.includes(origin);
}

/**
 * Origin / Sec-Fetch-Site gate for all unsafe methods (any Content-Type).
 *
 * Hono built-in csrf only checks form content types; this gateway also serves
 * application/json from the SPA, so browser CSRF protection for JSON mutations
 * is this middleware plus the CORS allowlist.
 *
 * Allowed when either check passes (same OR semantics as hono/csrf). Must not
 * run on OPTIONS (CORS preflight).
 */
export const csrfMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const method = parseHttpMethod(c.req.method);
  if (
    method === undefined ||
    method === HttpMethod.OPTIONS ||
    !isUnsafeHttpMethod(method)
  ) {
    return await next();
  }

  const resolution = resolveCorsOrigins(c.env.ENVIRONMENT, c.env.CORS_ORIGINS);
  if (!resolution.ok) {
    return c.json(
      {
        error: "Service Unavailable",
        requestId: c.get("requestId"),
      },
      503,
    );
  }

  const originOk = isAllowedOrigin(c.req.header("Origin"), resolution.origins);
  const secFetchOk = isAllowedSecFetchSite(c.req.header("Sec-Fetch-Site"));

  if (!originOk && !secFetchOk) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  return await next();
});
