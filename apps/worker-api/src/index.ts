import type { RequestIdVariables } from "hono/request-id";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { methodNotAllowed } from "hono/method-not-allowed";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { timing } from "hono/timing";
import { corsMiddleware } from "./middlewares/cors";
import { csrfMiddleware } from "./middlewares/csrf";
import healthRoute from "./routes/health";
import { resolveOpaqueRequestId } from "./utils/opaque-request-id";

const API_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 3 * 1024 * 1024;

type AppEnv = {
  Bindings: Env;
  Variables: RequestIdVariables;
};

const app = new Hono<AppEnv>();

// Accept client X-Request-Id only when opaque UUID; otherwise mint one.
app.use(
  requestId({
    headerName: "",
    generator: (c) => resolveOpaqueRequestId(c.req.header("X-Request-Id")),
  }),
);

app.use(async (c, next) => {
  await next();
  c.header("X-Request-Id", c.get("requestId"));
});

app.use(
  methodNotAllowed({
    app,
    onMethodNotAllowed: (c, methods) =>
      c.json({ error: "Method Not Allowed" }, 405, {
        Allow: methods.join(", "),
      }),
  }),
);

app.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  }),
);

app.use("/api/*", corsMiddleware);
app.use("/api/*", csrfMiddleware);

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
      version: c.env.CF_VERSION_METADATA.id,
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
