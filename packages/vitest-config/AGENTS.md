# @repo/vitest-config Agent Instructions

## Overview

Shared Vitest configuration factories: apps call them instead of duplicating pool, isolation, and mock-hygiene defaults. The repo follows Turborepo package-level caching, not root Vitest Projects: each app owns its `vitest.config` and its `test` (`vitest run` - CI, agents, Turbo cache) / `test:watch` (`vitest` - humans only) scripts, and `turbo run test` parallelizes and caches. App-side usage rules: rule `quality/testing` and the `tests/*` rules.

Changing this package is a monorepo-wide breaking change: after changing a factory, run `pnpm turbo run test --filter=front-app --filter=worker-api`.

## Structure

```
packages/vitest-config/
├── src/
│   ├── index.ts         # defineNodeConfig + resolvePackageRoot (front-*)
│   ├── workers.ts       # defineWorkersConfig + resolvePackageRoot (worker-*/queue-*/webhook-*/mcp-*)
│   └── package-root.js  # realpath helper shared by both entries (plain JS for Node ESM)
├── package.json
├── turbo.json        # tags: ["config"]
├── README.md
├── AGENTS.md
└── CLAUDE.md
```

No `check-types` script (same model as `@repo/typescript-config`): consuming apps typecheck their Vitest configs.

## Entries

- Two entry files on purpose: a Node app must never resolve `@cloudflare/vitest-plugin`. Each entry keeps its own private `sharedTestDefaults` (the mock-hygiene duplication is deliberate); never reintroduce a relative import between them.
- `resolvePackageRoot` lives in `package-root.js` and is re-exported from both. It runs `realpathSync` so the Vitest VS Code explorer's path walks match its workspace-folder cache (avoids `Fatal Error: Attempted to get parent of root folder "/"` on macOS).

## Editing rules

1. Keep the package `config`-tagged: no workspace dependency, not even on `@repo/typescript-config` (`config.dependencies.allow` is empty).
2. Stay JIT with source `.ts` exports; no build-to-dist step unless the monorepo moves off JIT configs.
3. Never set reporters in the shared defaults: that breaks Vitest's automatic agent detection and the GitHub Actions summary.
4. Node factory only: `environment: "node"`, `pool: "threads"`, `isolate: false`, `fsModuleCache` (a stable top-level option since Vitest 5). Never attach `cloudflareTest`.
5. Workers factory only: wrap `cloudflareTest`. Never `isolate: false`, a Node pool, or a custom environment or runner - Workers keep Cloudflare's per-file isolation.
6. Keep mock hygiene on: `restoreMocks`, `clearMocks`, `unstubEnvs`, `unstubGlobals`. The include globs diverge on purpose: Node matches `tests/**/*.test.{ts,tsx}` (component suites must never be silently skipped), Workers `tests/**/*.test.ts` (no JSX inside workerd). `passWithNoTests` stays at Vitest's default `false`, so a glob mismatch fails loudly; a package with no tests has no `vitest.config` and no `test` script rather than a passing empty run.
7. No coverage, blob reporters, or sharding without an explicit follow-up that wires Turbo outputs and a merge task.

## How to use

```ts
// apps/front-app/vitest.config.ts
import {
  defineNodeConfig,
  resolvePackageRoot,
} from "@repo/vitest-config";

const root = resolvePackageRoot(import.meta.dirname);

export default defineNodeConfig({
  root,
  test: { dir: root }, // required for Vitest VS Code explorer (realpath)
});
```

```ts
// apps/worker-api/vitest.config.mts
import {
  defineWorkersConfig,
  resolvePackageRoot,
} from "@repo/vitest-config/workers";

const root = resolvePackageRoot(import.meta.dirname);

export default defineWorkersConfig(
  { experimental: { newConfig: true } },
  { root, test: { dir: root } }, // required for Vitest VS Code explorer (realpath)
);
```

`experimental: { newConfig: true }` makes `@cloudflare/vitest-plugin` (1.3.1+) read the app's `cloudflare.config.ts` in mode `test`. Fake secret values live in that mode as `bindings.text()` bindings, not in `miniflare.bindings`; the generated `Env` types come from `.cloudflare/types/index.d.ts`, which the app's `tests/tsconfig.json` includes.

## Unit vs integration (Cloudflare)

| Layer | Tool | Use for |
|-------|------|---------|
| **Unit** | `defineWorkersConfig` / `@cloudflare/vitest-plugin` (tests inside workerd) | Handlers, helpers, single-Worker routes via `exports.default.fetch` / `env` from `cloudflare:workers` |
| **Integration** | Wrangler `createTestHarness()` from **Node** Vitest | Multi-Worker production builds, gateway to worker-* RPC, bindingOverrides, MSW/Playwright |

`front-*` always uses `defineNodeConfig`; never attach `cloudflareTest` or the harness to the SPA for unit suites.

## Multi-Worker integration (when to add createTestHarness)

Do **not** add a harness suite while the repo only has `worker-api` + `front-app`. Wire it when scaffolding the first `worker-*` (or a fixture pair) that `worker-api` binds with `bindings.worker()` in its `cloudflare.config.ts`.

1. Keep each Worker's existing Vitest pool suite for unit/route tests.
2. Add a Node Vitest project (or package script) that depends on `build` of the Workers under test: the harness runs production output, which `cf build` writes to `.cloudflare/output/`.
3. Start the harness with one `workers` entry for worker-api and one for the new worker. Its documented `configPath` inputs are a Wrangler config or the Vite plugin's generated `wrangler.json`, and neither exists here since the move to `cf`: confirm how the harness loads cf Build Output before wiring it ([test harness docs](https://developers.cloudflare.com/workers/testing/test-harness/)).
4. Lifecycle: beforeAll listen, afterEach reset, afterAll close; on failure call server.debug().
5. One golden example: gateway HTTP to service-binding RPC to assert response; use bindingOverrides / mock Workers for upstreams you do not want live.
6. Optional later: share lifecycle helpers from this package (Node entry only) once a second consumer exists - never preemptively.
7. Document the new suite in the owning apps' AGENTS.md and root AGENTS.md.
