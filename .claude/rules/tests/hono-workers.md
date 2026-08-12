---
paths:
  - "apps/worker-*/**"
  - "apps/queue-*/**"
  - "apps/webhook-*/**"
  - "apps/mcp-*/**"
---

# Hono Workers Vitest (Cloudflare pool)

Governs Vitest for Hono apps on Cloudflare Workers via `@cloudflare/vitest-pool-workers` (workerd). General bar: [vitest.md](vitest.md). Discipline: [testing.md](../quality/testing.md). Prefer Cloudflare / Hono docs (Context7) over training memory for API details.

## Repo invariants

- Config: `defineWorkersConfig` from `@repo/vitest-config/workers` + `wrangler: { configPath: "./wrangler.jsonc" }`. Do **not** use removed Cloudflare helpers `defineWorkersConfig` / `defineWorkersProject` from `@cloudflare/vitest-pool-workers/config`, or `test.poolOptions.workers` nesting.
- Prefer `import { env, exports } from "cloudflare:workers"`. `SELF` / `env` from `cloudflare:test` are deprecated; `fetchMock` is removed - mock `globalThis.fetch` or MSW. Integration default: `exports.default.fetch(...)`. Hono unit: `app.request(path, init?, env?)`.
- Storage isolation is **per test file** by default. Within a file, call `await reset()` when needed. Never `isolate: false` / `--no-isolate` casually (shares binding storage). Never set Node pool on Workers configs.
- `compatibility_date` / `compatibility_flags` come from `wrangler.jsonc` (`nodejs_compat` required). Prefer miniflare/wrangler vars for CI-stable secrets - do not write tests that only pass with a local `.dev.vars`.
- Types: `tests/env.d.ts` with `ProvidedEnv extends Env`; tests tsconfig includes `@cloudflare/vitest-pool-workers/types` and committed `worker-configuration.d.ts`.
- Assert status/body/headers/binding state - not `toBeDefined()`-only. Agents: `pnpm turbo run test --filter=<app>` non-watch.
