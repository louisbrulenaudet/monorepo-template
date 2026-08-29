# @repo/typescript-config Agent Instructions

## Overview

`@repo/typescript-config` provides **shared TypeScript configuration presets** for the entire monorepo. All Workers apps, React/Vite apps, and shared libraries extend one of these presets - never copy-paste compiler options.

Preset options, inheritance, editing rules, and common mistakes load from `.claude/rules/quality/typescript-config.md` or `.cursor/rules/quality/typescript-config.mdc` when editing this package or any `tsconfig*.json`.

## Structure

```
packages/typescript-config/
├── strict.json        # Shared strict flags - do not use directly in apps
├── library.json       # Runtime-neutral JIT libraries (ES only)
├── workers.json       # Thin role alias of library.json (Worker apps)
├── vite-react.json    # React + Vite applications
├── vite-node.json     # Node-oriented Vite projects
├── tests.json         # Mixin for tests/tsconfig.json - never used alone
├── package.json
└── README.md
```

## Preset Selection

| I am writing… | Extend |
|--------------|--------|
| A Cloudflare Worker (e.g. `worker-api`, `worker-*`, `queue-*`, `webhook-*`) | `workers.json` |
| A runtime-neutral library shared by browser and Workers (e.g. `dtos-common`, `enums-common`, `correlation-id`) | `library.json` |
| A React + Vite frontend (e.g. `front-app`) | `vite-react.json` |
| A Node-oriented Vite project | `vite-node.json` |
| A new runtime preset | `strict.json` |
| A package's `tests/tsconfig.json` | its runtime preset **plus** `tests.json` (array `extends`) |

If a Worker-only shared library later needs different options (e.g. real Worker globals), add a dedicated preset then - do not fork `workers.json` or `library.json` into the package.

### tests.json (mixin)

`tests.json` is a **mixin, not a runtime preset**: it sets no `lib`/`target` and never extends `strict.json`, so it must come **last** in an array `extends` after the package's own base config:

```jsonc
// packages/<pkg>/tests/tsconfig.json
{ "extends": ["../tsconfig.json", "@repo/typescript-config/tests.json"] }
```

It supplies the parts every test project shares - the `tsconfig.tests.tsbuildinfo` path under the **package** root (not `tests/node_modules/`), the `tests/` + `src/` include pair, and the exclude list. A package needing extra roots (`.tsx`, `vitest.setup.ts`, `worker-configuration.d.ts`) respells the whole `include` with `${configDir}` prefixes, because arrays replace rather than merge across `extends`.

The config file itself must stay at `tests/tsconfig.json` and keep that exact name: TypeScript's editor project lookup walks up for a file literally named `tsconfig.json`, and the package's root config includes `src/**` only - renaming it to `tsconfig.test.json` at the package root would leave test files in no project, breaking the IDE while `tsc -p` still passes in CI.

**Never** extend `strict.json` directly in an app or library - use a runtime preset. **Never** fork a preset into an app; only override what you must (`types`, `include`). Prefer package.json `"imports"` (`#/*`) over `compilerOptions.paths` for in-app absolute imports.

## How to Extend

```jsonc
// apps/worker-api/tsconfig.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@repo/typescript-config/workers.json",
  "compilerOptions": {
    "types": ["./worker-configuration.d.ts"]
  },
  "include": ["worker-configuration.d.ts", "src/**/*.ts"]
}
```

Run `pnpm types` after changing `wrangler.jsonc` to regenerate `worker-configuration.d.ts`, and commit the result - it is a committed generated file, verified in CI by `pnpm types:check`. Do not hand-edit it. If the Worker uses `nodejs_compat`, add `"node"` to `compilerOptions.types` and install `@types/node`.

## Commands

| Command (from root or per-app) | Description |
|-------------------------------|-------------|
| `pnpm check-types` | TypeScript across all packages (Turborepo, `tsc --noEmit` + transit) |

## Contribution

Preset changes are monorepo-wide - spot-check `worker-api`, `front-app`, and shared packages with `pnpm check-types` from the repo root. See root [AGENTS.md](../../AGENTS.md).
