# @repo/vitest-config Agent Instructions

## Overview

`@repo/vitest-config` provides **shared Vitest configuration factories** for the monorepo. Apps call these helpers instead of duplicating pool, isolation, and mock-hygiene defaults.

Cloudflare naming: the Workers Vitest pool is the **unit** layer; Wrangler `createTestHarness()` is the **integration** layer for multi-Worker production builds (see below). Do not rip out the pool to "upgrade" to the harness.

Editing rules and anti-patterns load from `.claude/rules/quality/vitest-config.md` or `.cursor/rules/quality/vitest-config.mdc` when touching this package. Test-authoring rules live under `.claude/rules/tests/` / `.cursor/rules/tests/`.

## Structure

```
packages/vitest-config/
├── src/
│   ├── index.ts         # defineNodeConfig + sharedTestDefaults + resolvePackageRoot (front-*)
│   ├── workers.ts       # defineWorkersConfig + resolvePackageRoot (worker-*/queue-*/webhook-*/mcp-*)
│   └── package-root.js  # realpath helper shared by both entries (plain JS for Node ESM)
├── package.json
├── turbo.json        # tags: ["config"]
├── README.md
├── AGENTS.md
└── CLAUDE.md
```

## Factory selection

| I am writing… | Import |
|---------------|--------|
| A `front-*` SPA | `@repo/vitest-config` → `defineNodeConfig` |
| A `worker-*` / `queue-*` / `webhook-*` / `mcp-*` app | `@repo/vitest-config/workers` → `defineWorkersConfig` |

Keep the Workers entry separate so Node-only apps never resolve `@cloudflare/vitest-pool-workers`. Shared mock-hygiene defaults are intentionally duplicated across the two entry files (no relative ESM imports between them).

This package has no `check-types` script (same model as `@repo/typescript-config`); consuming apps typecheck their Vitest configs.

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
import path from "node:path";
import {
  defineWorkersConfig,
  resolvePackageRoot,
} from "@repo/vitest-config/workers";

const root = resolvePackageRoot(import.meta.dirname);

export default defineWorkersConfig(
  { wrangler: { configPath: path.join(root, "wrangler.jsonc") } },
  { root, test: { dir: root } }, // required for Vitest VS Code explorer (realpath)
);
```

`resolvePackageRoot` runs `realpathSync` so explorer path walks match its workspace-folder cache (avoids `Fatal Error: Attempted to get parent of root folder "/"` on macOS).

App scripts: `test` = `vitest run` (CI/agents/Turbo cache); `test:watch` = `vitest` (Turbo task is cache false + persistent true; humans only).

## Unit vs integration (Cloudflare)

| Layer | Tool | Use for |
|-------|------|---------|
| **Unit** | `defineWorkersConfig` / `@cloudflare/vitest-pool-workers` (tests inside workerd) | Handlers, helpers, single-Worker routes via `exports.default.fetch` / `env` from `cloudflare:workers` |
| **Integration** | Wrangler `createTestHarness()` from **Node** Vitest | Multi-Worker production builds, gateway to worker-* RPC, bindingOverrides, MSW/Playwright |

`front-*` always uses `defineNodeConfig` (Node). Never attach `cloudflareTest` or the harness to the SPA for unit suites.

## Multi-Worker integration (when to add createTestHarness)

Do **not** add a harness suite while the repo only has `worker-api` + `front-app`. Wire it when scaffolding the first `worker-*` (or a fixture pair) that `worker-api` binds via `services`.

Checklist for that change:

1. Keep each Worker's existing Vitest pool suite for unit/route tests.
2. Add a Node Vitest project (or package script) that depends on `build` of the Workers under test (harness runs production output; for Vite-built Workers run `vite build` first and point at generated `dist/.../wrangler.json`).
3. Start the harness with both Wrangler configs, e.g. createTestHarness with configPath entries for worker-api and the new worker.
4. Lifecycle: beforeAll listen, afterEach reset, afterAll close; on failure call server.debug().
5. One golden example: gateway HTTP to service-binding RPC to assert response; use bindingOverrides / mock Workers for upstreams you do not want live.
6. Optional later: share lifecycle helpers from this package (Node entry only) once a second consumer exists - do not add them preemptively.
7. Document the new suite in the owning apps' AGENTS.md and root AGENTS.md.

Official docs: https://developers.cloudflare.com/workers/testing/ and https://developers.cloudflare.com/workers/testing/test-harness/

## Hard constraints

- Never set `reporters` in shared defaults (breaks Vitest 4.1 auto `agent` reporter detection).
- Never set `isolate: false` or a Node `pool` inside `defineWorkersConfig`.
- Never attach `cloudflareTest` to `front-*`.
- Never replace per-Worker pool suites with `createTestHarness` for single-Worker route tests.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm turbo run test --filter=front-app --filter=worker-api` | Spot-check consumers after factory changes |
| `pnpm -w exec oxfmt packages/vitest-config` / `oxlint packages/vitest-config` | Format / lint this package |

## Contribution

Factory changes are monorepo-wide - spot-check `front-app` and `worker-api` with filtered Vitest. See root [AGENTS.md](../../AGENTS.md).
