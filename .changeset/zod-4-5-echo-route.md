---
"front-app": minor
"worker-api": minor
---

Upgrade Zod to 4.5 and add a validated `POST /api/v1/echo` endpoint.

Zod 4.5 moves schema methods from eagerly-bound instance properties to lazy prototype getters, cutting retained memory per schema by roughly 7.5-10x and speeding up the `safeParse` failure path - both worth having on Workers, where isolate memory and cold-start CPU are the binding constraints.

`POST /api/v1/echo` is the gateway's first route to actually use `@hono/zod-validator`, which the repo already prescribed but nothing implemented. It validates its JSON body and an optional `?uppercase=true` query flag against new schemas in `@repo/dtos-common/api`, and returns `{ error, requestId, issues }` on a validation failure instead of Hono's default body. Because it reflects caller-supplied input on an unauthenticated route with no rate-limit binding, it is gated off in production and answers 404 there.
