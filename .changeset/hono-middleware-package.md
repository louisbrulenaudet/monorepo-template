---
"worker-api": patch
---

Move the gateway's app-agnostic Hono middleware into the new `@repo/hono-middleware` package, one export per middleware (`correlationRequestId`, `sentryMiddleware`, `exposeRequestId`, `jsonMethodNotAllowed`, `apiSecureHeaders`, `notFoundHandler`, `errorHandler`, `validator`); `worker-api` still registers each one itself in `src/index.ts`. Middlewares now throw `HTTPException` and `errorHandler` builds every `{ error, requestId }` body. Response changes: `Server-Timing` and pretty-printed JSON are sent in `dev` only (previously also `staging` and `preview`), and the 405 body now carries `requestId` like every other error.
