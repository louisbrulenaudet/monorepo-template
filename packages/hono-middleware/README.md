# @repo/hono-middleware

Hono middlewares and handlers shared by the public-HTTP Cloudflare Workers, so the per-request id, the locked-down Sentry config, the security headers and the JSON error envelope cannot drift between apps. Every piece is its own export; each app registers the ones it needs, in order, in its own `index.ts`.

## Usage

```typescript
import {
  apiSecureHeaders,
  errorHandler,
  jsonMethodNotAllowed,
  notFoundHandler,
  requestIdMiddleware,
  sentryMiddleware,
  type HonoEnv,
} from "@repo/hono-middleware";
import { Hono } from "hono";

const app = new Hono<HonoEnv<Env>>();

app.use(requestIdMiddleware);
app.use(sentryMiddleware(app, { release: "my-worker@1.0.0" }));
app.use(jsonMethodNotAllowed(app));
app.use(apiSecureHeaders);
// app-specific middleware and routes
app.notFound(notFoundHandler);
app.onError(errorHandler);
```

Validate route inputs with `validator`, whose failures come back as `400 { error, requestId, issues }`:

```typescript
import { validator } from "@repo/hono-middleware";

route.post("/", validator("json", SomeRequestSchema), (c) => {
  const body = c.req.valid("json");
  // ...
});
```

Agent and contributor detail: [AGENTS.md](AGENTS.md).
