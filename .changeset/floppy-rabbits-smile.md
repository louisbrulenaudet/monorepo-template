---
"front-app": patch
"worker-api": patch
---

Mint a fresh `X-Request-Id` for every request and ignore the inbound header

`front-app` no longer sends an id of its own and reads it from the response only, and `X-Request-Id` leaves the CORS request-header allowlist. SPA-to-gateway correlation in Sentry comes from `sentry-trace` and `baggage`.

**Error tracking:** every timeout (`504`) now reaches Sentry, not only the first per isolate. 5xx errors such as that `504` and the `503` for a missing CORS allowlist are logged with their request id, and error logs are structured objects, so Workers Logs can filter on `requestId`.

**SPA:** requests abort after 20 s instead of 8 s, longer than the gateway's 15 s timeout, so a slow request ends with the gateway's `504` and its request id. The error screen also shows the Sentry event id (`Error id`), so a failure without an HTTP response still leaves something to quote.
