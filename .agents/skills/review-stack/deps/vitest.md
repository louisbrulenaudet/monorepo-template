---
id: vitest
summary: node/workers presets, pools, testing split, reporters
families: [workers]
packages: [vitest, @cloudflare/vitest-plugin, @vitest/ui, happy-dom, @testing-library/react, @testing-library/dom, @testing-library/jest-dom, @testing-library/user-event]
paths: [packages/vitest-config/**, apps/*/vitest.config.*, .claude/rules/quality/vitest-config.md, .claude/rules/tests/**]
---

# Vitest

Vitest and the Cloudflare Workers pool: shared preset correctness, pool selection, agent-friendly output, and the unit/integration testing split.

## Ground truth

- **Collector**: "Vitest" at the installed major - config API (`mergeConfig`/`defineConfig`), pools (`threads`/`forks`/`vmThreads`), reporters (including agent-aware auto-detection), project patterns, experimental flags.
- **Collector (Workers pool)**: "@cloudflare/vitest-plugin" / Cloudflare Workers testing docs; the vendor documentation MCP takes precedence for vendor questions.
- **Web fallback**: `vitest.dev`, `developers.cloudflare.com/workers/testing/` - config reference, Workers testing guide, `createTestHarness()` reference.
- **Version currency**: catalog `vitest`, `@cloudflare/vitest-plugin` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); flag deprecated keys in presets or per-app configs.

## Scope

- [packages/vitest-config/src/index.ts](../../../../packages/vitest-config/src/index.ts) (`defineNodeConfig`) and [src/workers.ts](../../../../packages/vitest-config/src/workers.ts) (`defineWorkersConfig`)
- Per-app configs: [apps/front-app/vitest.config.ts](../../../../apps/front-app/vitest.config.ts), [apps/worker-api/vitest.config.mts](../../../../apps/worker-api/vitest.config.mts)
- Suites under `apps/*/tests/`; testing-split policy (root AGENTS.md + [packages/vitest-config/AGENTS.md](../../../../packages/vitest-config/AGENTS.md))
- Root `test` / `test:watch` turbo wiring

## Probe

Read both preset entries and every per-app config; sample one Node and one Workers suite; run `pnpm turbo run test --filter=worker-api` once.

## Axes

- **Shared defaults**: mock lifecycle (`restoreMocks`/`clearMocks`/unstub) coherent; `passWithNoTests` only as starter scaffolding; include globs match reality.
- **Pool selection**: Node suites on `threads` + `isolate: false` justified by cleanup discipline (verify tests clean up); Workers suites never `isolate: false` / custom env; Node apps never resolve the Cloudflare pool package.
- **Workers testing split**: single-Worker tests in workerd via the pool; multi-Worker integration reserved for Wrangler `createTestHarness()` from a Node suite.
- **Reporter & CI**: agent-aware reporter detection preserved; GitHub job summaries intact; watch vs run wiring correct.
- **Version currency**: experimental flags (`fsModuleCache`) still valid; new stable options worth adopting.
- **Agent loop**: per-app filter documented; failure output parseable; DOM/RTL depth delegated to skill `front-vitest`.

## Critical when

Broken isolation; pool misuse; deprecated config that fails on the installed version.

## Overlaps

Test value and pruning are out of scope (`/review-tests`); Workers runtime config belongs to `wrangler`.

## Accepted

- Preset rationale in [.claude/rules/quality/vitest-config.md](../../../../.claude/rules/quality/vitest-config.md) and [packages/vitest-config/AGENTS.md](../../../../packages/vitest-config/AGENTS.md).
