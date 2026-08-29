---
paths:
  - "packages/vitest-config/**"
---

# Shared Vitest Config (@repo/vitest-config)

Factories for per-package Vitest configs. This monorepo follows Turborepo package-level caching, not root Vitest Projects: each app owns vitest.config and test / test:watch scripts; turbo run test parallelizes and caches.

Official alignment:

- Turborepo Vitest guide: prefer package tasks plus a shared config package over Vitest Projects for cache hits
- Vitest: workspace is deprecated in favor of projects; we still avoid root projects so Turbo owns the graph
- Vitest performance: Node uses pool threads and isolate false; Workers keep Cloudflare per-file isolation
- Vitest 4.1: leave reporters unset so AI_AGENT / std-env can select the agent reporter

General test authoring: [vitest.md](../tests/vitest.md). Workers: [hono-workers.md](../tests/hono-workers.md). Front: [front-react.md](../tests/front-react.md). Package checklist: [AGENTS.md](../../../packages/vitest-config/AGENTS.md).

## Exports

| Import | For |
|--------|-----|
| @repo/vitest-config | defineNodeConfig, sharedTestDefaults, resolvePackageRoot for front-* |
| @repo/vitest-config/workers | defineWorkersConfig, resolvePackageRoot for worker-*, queue-*, webhook-*, mcp-* |

Two entry files on purpose: src/index.ts and src/workers.ts. Node apps must never resolve @cloudflare/vitest-plugin. Shared mock-hygiene defaults are intentionally duplicated across those files. Do not reintroduce a relative import between them. `resolvePackageRoot` lives in package-root.js and is re-exported from both.

## Editing rules

Changing this package is a monorepo-wide breaking change.

1. Keep the package config-tagged. Do not add a workspace dependency on @repo/typescript-config; config.dependencies.allow is empty.
2. Stay JIT with source .ts exports. Do not add a build-to-dist step unless the monorepo moves off JIT configs.
3. Do not set reporters in shared defaults. That breaks Vitest 4.1 auto agent detection and the GHA github-actions summary.
4. Node factory only: environment node, pool threads, isolate false, experimental.fsModuleCache. Never attach cloudflareTest.
5. Workers factory only: wrap cloudflareTest. Never set isolate false, a Node pool, or a custom environment or runner.
6. Keep mock hygiene on: restoreMocks, clearMocks, unstubEnvs, unstubGlobals, passWithNoTests true. Include globs diverge on purpose: the Node factory matches tests/**/*.test.{ts,tsx} (component suites must never be silently skipped), the Workers factory stays tests/**/*.test.ts (no JSX inside workerd). Apps with suites override passWithNoTests to false so a glob mismatch fails loudly; the shared true keeps test-less packages green.
7. Do not enable coverage, blob reporters, or sharding here without an explicit follow-up that wires Turbo outputs and a merge task.
8. After changing factories, run pnpm turbo run test --filter=front-app --filter=worker-api.

## App wiring

Front apps import defineNodeConfig and resolvePackageRoot from @repo/vitest-config.
Worker apps import defineWorkersConfig and resolvePackageRoot from @repo/vitest-config/workers with an absolute wrangler.configPath via path.join(root, "wrangler.jsonc").

Every app must set root and test.dir via resolvePackageRoot(import.meta.dirname) so the Vitest VS Code explorer realpath cache matches (avoids Fatal Error parent of root folder).

Scripts: test uses vitest run for CI, agents, and Turbo cache. test:watch uses vitest. The Turbo test:watch task is cache false and persistent true.

## Anti-patterns

- Replacing Workers Vitest pool suites with Wrangler `createTestHarness` for single-Worker unit/route tests (harness is multi-Worker integration only; see package AGENTS.md)

- Root vitest.config with test.projects or deprecated workspace as the primary CI path
- Importing @repo/vitest-config/workers from front-*
- Setting custom reporters without also including agent
- isolate false on Workers or --no-isolate for speed
- Merging full app vite.config into Vitest for front-*
