---
name: review-vitest
description: "Vitest review (@repo/vitest-config node/workers presets, Cloudflare Vitest pool, testing split) against current official Vitest and Cloudflare best practices. USE WHEN: user runs /review-vitest or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
---

# Review Vitest

Review the Vitest setup for alignment with current official Vitest and Cloudflare Workers testing best practices - shared config correctness, pool selection, agent-friendly output, and the repo's unit/integration testing split. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "workers pool only", "reporters") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of Vitest may be outdated. **Do not draft suggestions from memory alone.**

1. Resolve "Vitest" via the **Context7 MCP** (`resolve-library-id` → `query-docs`) at v4: config API (`mergeConfig`/`defineConfig`), pool options (`threads`/`forks`/`vmThreads`), reporter list (including agent-aware auto-detection), project/workspace patterns, experimental flags validity.
2. Also resolve "@cloudflare/vitest-plugin" (or "Cloudflare Workers" docs) for current Workers-pool guidance; prefer the **cloudflare-docs MCP** for Workers testing questions.
3. For anything Context7 lacks, use **Firecrawl search/scrape restricted to official domains** (`vitest.dev`, `developers.cloudflare.com/workers/testing/`) - vitest config reference, Workers testing guide, `createTestHarness()` reference.
4. Version currency: catalog `vitest`, `@cloudflare/vitest-plugin` in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) vs latest stable; flag deprecated config keys still present in presets or per-app configs.
5. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [packages/vitest-config/src/index.ts](../../../packages/vitest-config/src/index.ts) (`defineNodeConfig`) and [src/workers.ts](../../../packages/vitest-config/src/workers.ts) (`defineWorkersConfig`)
- Per-app configs: [apps/front-app/vitest.config.ts](../../../apps/front-app/vitest.config.ts), [apps/worker-api/vitest.config.mts](../../../apps/worker-api/vitest.config.mts)
- Suites under `apps/*/tests/`; repo testing-split policy (root + `packages/vitest-config/AGENTS.md`)
- Root scripts `test` / `test:watch` turbo wiring

## Analysis axes

- **Shared defaults**: mock lifecycle (`restoreMocks`/`clearMocks`/unstub) coherent; `passWithNoTests` acceptable only as starter scaffolding - flag if permanent; include globs match reality.
- **Pool selection**: Node suites on `threads` + `isolate: false` justified by cleanup discipline (verify tests actually clean up); Workers suites never isolate:false/custom env; no cross-contamination between entries (Node apps must not resolve the Cloudflare pool package).
- **Workers testing split**: single-Worker route tests inside workerd via the Vitest pool; multi-Worker integration reserved for Wrangler `createTestHarness()` from a Node suite - confirm no drift.
- **Reporter & CI behavior**: agent-aware reporter detection preserved (no custom reporters defeating it); GitHub job summaries intact; watch vs run mode wiring correct.
- **Version currency**: experimental flags (`fsModuleCache`) still valid at installed version; new stable options worth adopting.

## DX & AI-agentic workflow

Verify agent-friendliness: test runs fast enough for iterative agents (per-app filter documented); failure output parseable; DOM/RTL depth delegated to the `front-vitest` skill rather than duplicated.

## Steps

1. Collect ground truth before reading config.
2. Read both preset entries and every per-app config; sample one Node and one Workers suite.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - broken isolation, pool misuse, deprecated-and-failing config.
2. **Improvements** - speed and split-policy alignment with current guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
