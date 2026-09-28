import { isUnsafeHttpMethod, parseHttpMethod } from "@repo/enums-common";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../app-env";
import { isAllowedCorsOrigin, resolveCorsOrigins } from "./cors-origins";

function isAllowedSecFetchSite(value: string | undefined): boolean {
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
  if (allowedOrigins === null) {
    return true;
  }
  return isAllowedCorsOrigin(origin, allowedOrigins);
}

/** Origin / Sec-Fetch-Site gate for all unsafe methods (any Content-Type). */
export const csrfMiddleware = createMiddleware<AppEnv>(
  async function originGate(c, next) {
    const method = parseHttpMethod(c.req.method);
    if (method === undefined || !isUnsafeHttpMethod(method)) {
      return await next();
    }

    const resolution = resolveCorsOrigins(
      c.env.ENVIRONMENT,
      c.env.CORS_ORIGINS,
    );
    if (!resolution.ok) {
      throw new HTTPException(503, { message: "Service Unavailable" });
    }

    const originOk = isAllowedOrigin(
      c.req.header("Origin"),
      resolution.origins,
    );
    const secFetchOk = isAllowedSecFetchSite(c.req.header("Sec-Fetch-Site"));

    if (!originOk && !secFetchOk) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    return await next();
  },
);
