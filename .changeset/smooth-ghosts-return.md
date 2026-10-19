---
"front-app": patch
"worker-api": patch
---

Bump `react`, `@sentry/*`, `@tanstack/*`, and `zod` runtime dependencies, and the build toolchain

**Versions:** `react` and `react-dom` 19.3.1, `@sentry/react`, `@sentry/cloudflare`, and `@sentry/hono` 11.8.0, `@tanstack/react-query` 5.104.4, `@tanstack/react-router` 1.170.45, and `zod` 4.6.7.

**Toolchain:** `vite` 8.3.4, `wrangler` 4.151.2, `turbo` 2.11.9, `cf` 1.0.0-beta.18, `@sentry/vite-plugin` 11.8.0, `@vitejs/plugin-react` 6.1.2, `@cloudflare/vitest-plugin` 1.4.5 (Vitest 5), `oxlint-tsgolint` 7.0.2004, the `@vitejs/devtools*` 0.8.0 family, and `@hono/cli` 1.0.0-rc.8.

Neither advisory that `vite` 8.3.3 fixes (GHSA-vfpm-58rq-9qcg, GHSA-rq7h-c2jc-7f22) reaches a deployed app: both need a dev server exposed with `--host`.
