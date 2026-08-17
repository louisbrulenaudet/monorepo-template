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

If a Worker-only shared library later needs different options (e.g. real Worker globals), add a dedicated preset then - do not fork `workers.json` or `library.json` into the package.

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
