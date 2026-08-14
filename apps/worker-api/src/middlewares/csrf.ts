import type { RequestIdVariables } from "hono/request-id";
import {
  HttpMethod,
  isUnsafeHttpMethod,
  parseHttpMethod,
} from "@repo/enums-common";
import { csrf } from "hono/csrf";
import { createMiddleware } from "hono/factory";
import { parseCorsOrigins } from "./cors-origins";

type AppEnv = {
  Bindings: Env;
  Variables: RequestIdVariables;
};

/**
 * CSRF for unsafe methods only — must not block CORS preflight. Origin
 * allowlist mirrors CORS via `c.env.CORS_ORIGINS`.
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

  const allowedOrigins = parseCorsOrigins(c.env.CORS_ORIGINS);
  return csrf({
    origin: allowedOrigins ?? (() => true),
    secFetchSite: (value) => value === "same-origin" || value === "same-site",
  })(c, next);
});
