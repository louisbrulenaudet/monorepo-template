import type { RequestIdVariables } from "hono/request-id";
import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_HTTP_METHODS,
  HttpMethod,
  isUnsafeHttpMethod,
  parseHttpMethod,
} from "@repo/enums-common";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { timing } from "hono/timing";
import healthRoute from "./routes/health";

const API_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 3 * 1024 * 1024;

type WorkerApiBindings = Env & {
  CORS_ORIGINS?: string;
};

type AppEnv = {
  Bindings: WorkerApiBindings;
  Variables: RequestIdVariables;
};

const app = new Hono<AppEnv>();

app.use(requestId());

app.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  }),
);

/** `null` means permissive mode (any origin). */
function parseCorsOrigins(value: string | undefined): string[] | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : null;
}

app.use("/api/*", (c, next) => {
  const allowedOrigins = parseCorsOrigins(c.env.CORS_ORIGINS);
  return cors({
    origin: allowedOrigins ?? "*",
    allowHeaders: [...CORS_ALLOWED_HEADERS],
    allowMethods: [...CORS_ALLOWED_HTTP_METHODS],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 600,
  })(c, next);
});

// CSRF should not block CORS preflight, and only applies to unsafe methods.
app.use("/api/*", async (c, next) => {
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

const api = new Hono<AppEnv>();

// Server-Timing header for local profiling. Disabled in production: Workers
// timer metrics are inaccurate, and internal timings should not leak to clients.
api.use(async (c, next) => {
  if (c.env.ENVIRONMENT === "production") {
    return await next();
  }
  return timing()(c, next);
});

// Safety-net timeout (returns 504). NOTE: this races the handler but does not
// cancel it, and cannot wrap streaming responses - see the hono-gateway rule.
api.use(timeout(API_TIMEOUT_MS));

api.use(
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => c.json({ error: "Request body too large" }, 413),
  }),
);

api.use(async (c, next) => {
  if (c.env.ENVIRONMENT !== "production") {
    return prettyJSON()(c, next);
  }
  return await next();
});

api.route("/health", healthRoute);

app.route("/api/v1", api);

app.get("/", (c) =>
  c.json(
    {
      message: "Worker API",
      version: "1.0.0",
    },
    200,
    {
      "Cache-Control": "public, max-age=3600",
    },
  ),
);

app.notFound((c) =>
  c.json({ error: "Not Found", requestId: c.get("requestId") }, 404),
);

app.onError((error, c) => {
  const reqId = c.get("requestId");
  if (error instanceof HTTPException) {
    return c.json({ error: error.message, requestId: reqId }, error.status);
  }
  console.error(
    JSON.stringify({
      level: "error",
      requestId: reqId,
      message: error.message,
      stack: error.stack,
    }),
  );
  return c.json({ error: "Internal server error", requestId: reqId }, 500);
});

export default app;
