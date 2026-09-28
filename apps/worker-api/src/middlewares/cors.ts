import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_HTTP_METHODS,
  CORS_EXPOSED_HEADERS,
} from "@repo/enums-common";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../app-env";
import { isAllowedCorsOrigin, resolveCorsOrigins } from "./cors-origins";

const CORS_ALLOW_HEADERS: string[] = [...CORS_ALLOWED_HEADERS];
const CORS_ALLOW_METHODS: string[] = [...CORS_ALLOWED_HTTP_METHODS];
const CORS_EXPOSE_HEADERS: string[] = [...CORS_EXPOSED_HEADERS];

/** Env-dependent CORS: build hono/cors from c.env per request. */
export const corsMiddleware = createMiddleware<AppEnv>(
  async function envCors(c, next) {
    const resolution = resolveCorsOrigins(
      c.env.ENVIRONMENT,
      c.env.CORS_ORIGINS,
    );
    if (!resolution.ok) {
      throw new HTTPException(503, { message: "Service Unavailable" });
    }

    const allowedOrigins = resolution.origins;
    return cors({
      // Permissive `*` only when resolveCorsOrigins allowed null (non-strict envs).
      origin:
        allowedOrigins === null
          ? "*"
          : (origin) =>
              isAllowedCorsOrigin(origin, allowedOrigins) ? origin : null,
      allowHeaders: CORS_ALLOW_HEADERS,
      allowMethods: CORS_ALLOW_METHODS,
      exposeHeaders: CORS_EXPOSE_HEADERS,
      maxAge: 600,
    })(c, next);
  },
);
