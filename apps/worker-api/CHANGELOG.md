# worker-api

## 0.1.0

### Minor Changes

- [`5d6867c`](https://github.com/louisbrulenaudet/monorepo-template/commit/5d6867c7d67f446e297035eb094cf68b7bbbae4b) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Baseline release: shared app versioning via Changesets, runtime version exposure on `/api/v1/health` and in the SPA footer, and a CI-gated production deploy driven by the `vX.Y.Z` release tag.

- [#23](https://github.com/louisbrulenaudet/monorepo-template/pull/23) [`a01cf05`](https://github.com/louisbrulenaudet/monorepo-template/commit/a01cf05b18aebc7547afa36717ff05c696196509) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Upgrade Zod to 4.5 and add a validated `POST /api/v1/echo` endpoint.
  
  Zod 4.5 moves schema methods from eagerly-bound instance properties to lazy prototype getters, cutting retained memory per schema by roughly 7.5-10x and speeding up the `safeParse` failure path - both worth having on Workers, where isolate memory and cold-start CPU are the binding constraints.
  
  `POST /api/v1/echo` is the gateway's first route to actually use `@hono/zod-validator`, which the repo already prescribed but nothing implemented. It validates its JSON body and an optional `?uppercase=true` query flag against new schemas in `@repo/dtos-common/api`, and returns `{ error, requestId, issues }` on a validation failure instead of Hono's default body. Because it reflects caller-supplied input on an unauthenticated route with no rate-limit binding, it is gated off in production and answers 404 there.
