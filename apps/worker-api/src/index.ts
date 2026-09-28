import type { Context } from "hono";
import { AppEnvironment } from "@repo/enums-common";
import {
  apiSecureHeaders,
  errorHandler,
  jsonMethodNotAllowed,
  notFoundHandler,
  requestIdMiddleware,
  sentryMiddleware,
} from "@repo/hono-middleware";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { prettyJSON } from "hono/pretty-json";
import { timeout } from "hono/timeout";
import { timing } from "hono/timing";
import type { AppEnv } from "./app-env";
import { version } from "../package.json";
import { corsMiddleware } from "./middlewares/cors";
import { csrfMiddleware } from "./middlewares/csrf";
import echoRoute from "./routes/echo";
import healthRoute from "./routes/health";

const API_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 3 * 1024 * 1024;

const app = new Hono<AppEnv>();

app.use(requestIdMiddleware);
app.use(sentryMiddleware(app, { release: `worker-api@${version}` }));
app.use(jsonMethodNotAllowed(app));
app.use(apiSecureHeaders);
app.use("/api/*", corsMiddleware);
app.use("/api/*", csrfMiddleware);

const api = new Hono<AppEnv>();

api.use(
  timing({
    enabled: (c: Context<AppEnv>) => c.env.ENVIRONMENT === AppEnvironment.DEV,
  }),
);

api.use(
  timeout(
    API_TIMEOUT_MS,
    () => new HTTPException(504, { message: "Gateway Timeout" }),
  ),
);

api.use(
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: () => {
      throw new HTTPException(413, { message: "Request body too large" });
    },
  }),
);

api.use(async function devPrettyJson(c, next) {
  if (c.env.ENVIRONMENT === AppEnvironment.DEV) {
    return prettyJSON()(c, next);
  }
  return await next();
});

// Echo is a demo surface: it reflects caller-supplied input on an
// unauthenticated public POST and has no rate-limit binding. 404 rather than
// 403 so production does not advertise that the route exists at all.
api.use("/echo", async function hideEchoInProduction(c, next) {
  if (c.env.ENVIRONMENT === AppEnvironment.PRODUCTION) {
    return c.notFound();
  }
  return await next();
});

api.route("/echo", echoRoute);
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

app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
