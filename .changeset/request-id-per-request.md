---
"worker-api": patch
"front-app": patch
---

`X-Request-Id` now names one Worker invocation. `worker-api` mints a fresh UUID per request with `requestIdMiddleware` (replacing `correlationRequestId` + `exposeRequestId`) and ignores any inbound `X-Request-Id`, which also leaves the CORS request allowlist; `front-app` no longer sends a per-tab `sessionStorage` id and reads the id from the response only. `errorHandler` logs a structured object instead of a JSON string, so Workers Logs can filter on `requestId`. `@repo/correlation-id` is removed; SPA ↔ gateway correlation in Sentry comes from `sentry-trace` / `baggage`.

Error tracking fixes: every timeout (`504`) now reaches Sentry, not only the first one per isolate, because `timeout()` gets a fresh `HTTPException` per request; `errorHandler` also logs 5xx `HTTPException`s (the `504`, the `503` for a missing CORS allowlist), so their request id is findable in Workers Logs; and `front-app` waits 20 s instead of 8 s before aborting, longer than the gateway's 15 s timeout, so a slow request ends with the gateway's `504` and its request id instead of an anonymous client-side abort.

`front-app`'s error screen now also shows the Sentry event id (`Error id`) of the error it renders, so a failure with no HTTP response - a network error, a client-side timeout, a schema mismatch, a render crash - still leaves the user something to quote.
