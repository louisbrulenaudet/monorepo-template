---
"front-app": patch
"worker-api": patch
---

Bump the build toolchain: `vite` 8.3.3, `wrangler` 4.140.0, `turbo` 2.11.5

Also `@vitejs/plugin-react` 6.1.2, `@cloudflare/vitest-plugin` 1.2.7, `oxlint-tsgolint` 7.0.2003, the `@vitejs/devtools*` 0.7.6 family, and `@hono/cli` 0.2.0-next.9. Neither advisory that `vite` 8.3.3 fixes (GHSA-vfpm-58rq-9qcg, GHSA-rq7h-c2jc-7f22) reaches a deployed app: both need a dev server exposed with `--host`.
