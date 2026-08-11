# @repo/vitest-config Agent Instructions

## Overview

`@repo/vitest-config` provides **shared Vitest configuration factories** for the monorepo. Apps call these helpers instead of duplicating pool, isolation, and mock-hygiene defaults.

Editing rules and anti-patterns load from `.claude/rules/quality/vitest-config.md` or `.cursor/rules/quality/vitest-config.mdc` when touching this package. Test-authoring rules live under `.claude/rules/tests/` / `.cursor/rules/tests/`.

## Structure

```
packages/vitest-config/
├── src/
│   ├── index.ts      # defineNodeConfig + sharedTestDefaults (front-*)
│   └── workers.ts    # defineWorkersConfig (worker-*/queue-*/webhook-*/mcp-*)
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
import { defineNodeConfig } from "@repo/vitest-config";
export default defineNodeConfig();
```

```ts
// apps/worker-api/vitest.config.mts
import { defineWorkersConfig } from "@repo/vitest-config/workers";
export default defineWorkersConfig({
  wrangler: { configPath: "./wrangler.jsonc" },
});
```

App scripts: `test` = `vitest run` (CI/agents/Turbo cache); `test:watch` = `vitest` (Turbo task is cache false + persistent true; humans only).

## Hard constraints

- Never set `reporters` in shared defaults (breaks Vitest 4.1 auto `agent` reporter detection).
- Never set `isolate: false` or a Node `pool` inside `defineWorkersConfig`.
- Never attach `cloudflareTest` to `front-*`.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm turbo run test --filter=front-app --filter=worker-api` | Spot-check consumers after factory changes |
| `pnpm -w exec oxfmt packages/vitest-config` / `oxlint … packages/vitest-config` | Format / lint this package |

## Contribution

Factory changes are monorepo-wide - spot-check `front-app` and `worker-api` with filtered Vitest. See root [AGENTS.md](../../AGENTS.md).
