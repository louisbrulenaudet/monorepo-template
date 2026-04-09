// src/index.ts

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import healthRoute from "./routes/health";

type WorkerApiBindings = Env & {
  CORS_ORIGINS?: string;
};

const app = new Hono<{ Bindings: WorkerApiBindings }>();

app.use(secureHeaders());

const defaultAllowedOrigins = ["http://localhost:5174"];
const allowedHeaders = ["Content-Type", "Authorization"];
const allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) {
    return defaultAllowedOrigins;
  }
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : defaultAllowedOrigins;
}

app.use("/api/*", (c, next) => {
  const allowedOrigins = parseCorsOrigins(c.env.CORS_ORIGINS);
  return cors({
    origin: allowedOrigins,
    allowHeaders: allowedHeaders,
    allowMethods: allowedMethods,
    maxAge: 600,
  })(c, next);
});

// CSRF should not block CORS preflight, and only applies to unsafe methods.
app.use("/api/*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return await next();
  }

  const method = c.req.method.toUpperCase();
  const isUnsafe =
    method === "POST" ||
    method === "PUT" ||
    method === "PATCH" ||
    method === "DELETE";
  if (!isUnsafe) {
    return await next();
  }

  const allowedOrigins = parseCorsOrigins(c.env.CORS_ORIGINS);

  return csrf({
    origin: allowedOrigins,
    secFetchSite: (value) => value === "same-origin" || value === "same-site",
  })(c, next);
});

const api = new Hono<{ Bindings: WorkerApiBindings }>();

api.use(
  bodyLimit({
    maxSize: 3 * 1024 * 1024,
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
  ),
);

app.notFound((c) => c.json({ error: "Not Found" }, 404));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
