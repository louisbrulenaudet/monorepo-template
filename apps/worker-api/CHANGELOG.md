# worker-api

## 0.1.0

### Minor Changes

- [`5d6867c`](https://github.com/louisbrulenaudet/monorepo-template/commit/5d6867c7d67f446e297035eb094cf68b7bbbae4b) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Baseline release: shared app versioning via Changesets, runtime version exposure on `/api/v1/health` and in the SPA footer, and a CI-gated production deploy driven by the `vX.Y.Z` release tag.

- [#28](https://github.com/louisbrulenaudet/monorepo-template/pull/28) [`d00829f`](https://github.com/louisbrulenaudet/monorepo-template/commit/d00829f7454bbf78d54b700c6aa03ae1b930c3ed) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Add Sentry error tracking: `@sentry/hono` on the gateway (`SENTRY_DSN` secret) and `@sentry/react` on the SPA (`VITE_SENTRY_DSN`), with distributed tracing between them, matching Sentry environments (`VITE_APP_ENVIRONMENT`), and privileged-data collection and console breadcrumbs disabled. Source maps upload to Sentry from CD; the SPA loads router tracing after first render and reports unexpected TanStack Query errors.

- [#28](https://github.com/louisbrulenaudet/monorepo-template/pull/28) [`8bb9668`](https://github.com/louisbrulenaudet/monorepo-template/commit/8bb96682f8d775a9ea5d8f8e669352ee3dc665f2) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Add Worker Previews support: `env.production.previews` config and `AppEnvironment.PREVIEW`, the only environment where `CORS_ORIGINS` may hold a single-label prefix wildcard.

- [#23](https://github.com/louisbrulenaudet/monorepo-template/pull/23) [`a01cf05`](https://github.com/louisbrulenaudet/monorepo-template/commit/a01cf05b18aebc7547afa36717ff05c696196509) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Upgrade Zod to 4.5 and add a validated `POST /api/v1/echo` endpoint.
  
  Zod 4.5 moves schema methods from eagerly-bound instance properties to lazy prototype getters, cutting retained memory per schema by roughly 7.5-10x and speeding up the `safeParse` failure path - both worth having on Workers, where isolate memory and cold-start CPU are the binding constraints.
  
  `POST /api/v1/echo` is the gateway's first route to actually use `@hono/zod-validator`, which the repo already prescribed but nothing implemented. It validates its JSON body and an optional `?uppercase=true` query flag against new schemas in `@repo/dtos-common/api`, and returns `{ error, requestId, issues }` on a validation failure instead of Hono's default body. Because it reflects caller-supplied input on an unauthenticated route with no rate-limit binding, it is gated off in production and answers 404 there.

### Patch Changes

- [#28](https://github.com/louisbrulenaudet/monorepo-template/pull/28) [`d00829f`](https://github.com/louisbrulenaudet/monorepo-template/commit/d00829f7454bbf78d54b700c6aa03ae1b930c3ed) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Bump the build and dev toolchain: `wrangler` 4.140.0, `@cloudflare/vitest-plugin` 1.2.7, `vite` 8.3.1, `turbo` 2.11.4, `oxlint-tsgolint` 7.0.2003 and the `@vitejs/devtools*` 0.7.6 family.
  
  `@hono/cli` moves to 0.2.0-next.9, which makes the `hono request` path positional: `hono request /api/v1/health --runtime workerd` replaces the removed `-P` flag. The Workers Vitest pool stays on Vitest 4, since `@cloudflare/vitest-plugin` 1.2.7 still peers on `vitest ^4.1.0`. `@cloudflare/vite-plugin` returns to its 1.57.3 pin: 1.58.0 through 1.60.1 break the inline-module HTML proxy in `front-app` dev.
