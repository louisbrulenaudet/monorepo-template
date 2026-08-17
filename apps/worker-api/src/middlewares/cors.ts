import type { RequestIdVariables } from "hono/request-id";
import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_HTTP_METHODS,
} from "@repo/enums-common";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { resolveCorsOrigins } from "./cors-origins";

type AppEnv = {
  Bindings: Env;
  Variables: RequestIdVariables;
};

const CORS_ALLOW_HEADERS: string[] = [...CORS_ALLOWED_HEADERS];
const CORS_ALLOW_METHODS: string[] = [...CORS_ALLOWED_HTTP_METHODS];
const CORS_EXPOSE_HEADERS: string[] = ["X-Request-Id", "X-Worker-Version-Id"];

/** Env-dependent CORS: build hono/cors from c.env per request. */
export const corsMiddleware = createMiddleware<AppEnv>(async (c, next) => {
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

  return cors({
    // Permissive `*` only when resolveCorsOrigins allowed null (non-strict envs).
    origin: resolution.origins ?? "*",
    allowHeaders: CORS_ALLOW_HEADERS,
    allowMethods: CORS_ALLOW_METHODS,
    exposeHeaders: CORS_EXPOSE_HEADERS,
    maxAge: 600,
  })(c, next);
});
