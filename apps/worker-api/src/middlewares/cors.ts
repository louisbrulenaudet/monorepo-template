import type { RequestIdVariables } from "hono/request-id";
import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_HTTP_METHODS,
} from "@repo/enums-common";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { parseCorsOrigins } from "./cors-origins";

type AppEnv = {
  Bindings: Env;
  Variables: RequestIdVariables;
};

const CORS_ALLOW_HEADERS: string[] = [...CORS_ALLOWED_HEADERS];
const CORS_ALLOW_METHODS: string[] = [...CORS_ALLOWED_HTTP_METHODS];
const CORS_EXPOSE_HEADERS: string[] = ["X-Request-Id", "X-Worker-Version-Id"];

/** Env-dependent CORS: build hono/cors from c.env per request. */
export const corsMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const allowedOrigins = parseCorsOrigins(c.env.CORS_ORIGINS);
  return cors({
    origin: allowedOrigins ?? "*",
    allowHeaders: CORS_ALLOW_HEADERS,
    allowMethods: CORS_ALLOW_METHODS,
    exposeHeaders: CORS_EXPOSE_HEADERS,
    maxAge: 600,
  })(c, next);
});
