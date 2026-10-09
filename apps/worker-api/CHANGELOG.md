# worker-api

## 0.1.0

### Minor Changes

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Report the release version on `/api/v1/health` and on the `front-app` home page

  Both apps now share one version, and each production deploy starts from a CI-validated `vX.Y.Z` tag.

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Add Worker Previews: a per-branch Preview of each production Worker

  `CORS_ORIGINS` may hold a single-label prefix wildcard only in the `preview` environment (`AppEnvironment.PREVIEW`).

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Add a validated `POST /api/v1/echo` endpoint, which answers 404 in production

  It validates a JSON body and an optional `?uppercase=true` flag, and answers a validation failure with `{ error, requestId, issues }`. It is off in production because it reflects caller input on an unauthenticated route with no rate limit.

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Add Sentry error tracking to `worker-api` and `front-app`, with distributed tracing between them

  **Operator action:** set the `SENTRY_DSN` secret on `worker-api-production` once before the first deploy, or the upload fails. The SPA reads `VITE_SENTRY_DSN` and `VITE_APP_ENVIRONMENT` at build time.

  Sensitive-data collection and console breadcrumbs are off. With `SENTRY_ORG` set, CD uploads source maps; the SPA loads router tracing after first render and reports unexpected TanStack Query errors.

- [#40](https://github.com/louisbrulenaudet/monorepo-template/pull/40) [`d66ae53`](https://github.com/louisbrulenaudet/monorepo-template/commit/d66ae537474603130becf05b934737446c7ca059) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Redact query strings from Workers logs and traces, and enable Workers Issues on `worker-api`

  **Operator:** deployed Workers no longer record query strings in Workers Logs or traces, so filter by path or `requestId` instead. After the next deploy, check that the `worker-api-production` Issues page shows Issues as enabled.

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Build and deploy both apps with the Cloudflare CLI (`cf`) instead of Wrangler

  Each app is configured by a typed `cloudflare.config.ts` instead of `wrangler.jsonc`. CD uploads with `cf workers versions create` and promotes with `cf workers deployments create`; Wrangler remains only for `wrangler tail`, single secret puts, and Preview deletion and secrets.

  Deployed Worker names, bindings, observability settings, and responses are unchanged. Previews now bind `SENTRY_DSN` to an empty string instead of leaving it unset, so Sentry stays off there as before.

### Patch Changes

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Add `requestId` to the 405 body, and send `Server-Timing` and pretty JSON in `dev` only

  `Server-Timing` headers and pretty-printed JSON were also sent in `staging` and Previews. Every error body, the 405 included, is now `{ error, requestId }`.

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Upgrade Zod to 4.5, cutting retained memory per schema by roughly 7.5-10x

  The `safeParse` failure path is faster too, which matters on Workers, where isolate memory and cold-start CPU are the binding constraints.

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Mint a fresh `X-Request-Id` for every request and ignore the inbound header

  `front-app` no longer sends an id of its own and reads it from the response only, and `X-Request-Id` leaves the CORS request-header allowlist. SPA-to-gateway correlation in Sentry comes from `sentry-trace` and `baggage`.

  **Error tracking:** every timeout (`504`) now reaches Sentry, not only the first per isolate. 5xx errors such as that `504` and the `503` for a missing CORS allowlist are logged with their request id, and error logs are structured objects, so Workers Logs can filter on `requestId`.

  **SPA:** requests abort after 20 s instead of 8 s, longer than the gateway's 15 s timeout, so a slow request ends with the gateway's `504` and its request id. The error screen also shows the Sentry event id (`Error id`), so a failure without an HTTP response still leaves something to quote.

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Move both Workers to compatibility date 2026-09-23

  No compatibility flag changes its default in between.

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Stop a caller-supplied `sentry-trace` or `baggage` header from forcing 100% trace sampling

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Fix `POST /api/v1/echo` answering a non-object JSON body with "unexpected field in request body"

  It now answers "request body must be a JSON object".

- [#37](https://github.com/louisbrulenaudet/monorepo-template/pull/37) [`3c02201`](https://github.com/louisbrulenaudet/monorepo-template/commit/3c022012d3e88cc51ed842221fa5f9d55a157b75) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Bump `hono` from ^4.13.11 to ^4.13.12

- [#35](https://github.com/louisbrulenaudet/monorepo-template/pull/35) [`55ad871`](https://github.com/louisbrulenaudet/monorepo-template/commit/55ad871b509cd4fe2075c66baa7a922f354610cc) Thanks [@louisbrulenaudet](https://github.com/louisbrulenaudet)! - Bump the build toolchain: `vite` 8.3.4, `wrangler` 4.149.0, `turbo` 2.11.5

  Also `@vitejs/plugin-react` 6.1.2, `@cloudflare/vitest-plugin` 1.4.0 (Vitest 5), `oxlint-tsgolint` 7.0.2003, the `@vitejs/devtools*` 0.7.6 family, and `@hono/cli` 0.2.0-next.9. Neither advisory that `vite` 8.3.3 fixes (GHSA-vfpm-58rq-9qcg, GHSA-rq7h-c2jc-7f22) reaches a deployed app: both need a dev server exposed with `--host`.
