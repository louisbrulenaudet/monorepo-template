# @repo/typescript-config Agent Instructions

## Overview

`@repo/typescript-config` provides **shared TypeScript configuration presets** for the entire monorepo. All Workers apps, React/Vite apps, and shared libraries extend one of these presets - never copy-paste compiler options.

Preset options, inheritance, editing rules, and common mistakes load from `.claude/rules/quality/typescript-config.md` or `.cursor/rules/quality/typescript-config.mdc` when editing this package or any `tsconfig*.json`.

## Structure

```
packages/typescript-config/
├── strict.json        # Shared strict flags - do not use directly in apps
├── workers.json       # Cloudflare Workers apps and services
├── workers-lib.json   # Shared libraries targeting the Workers runtime
├── vite-react.json    # React + Vite applications
├── vite-node.json     # Node-oriented Vite projects
├── package.json
└── README.md
```

## Preset Selection

| I am writing… | Extend |
|--------------|--------|
| A Cloudflare Worker (e.g. `worker-api`, `worker-*`, `queue-*`, `webhook-*`) | `workers.json` |
| A shared library used by Workers (e.g. `dtos-common`, `enums-common`) | `workers-lib.json` |
| A React + Vite frontend (e.g. `front-app`) | `vite-react.json` |
| A Node-oriented Vite project | `vite-node.json` |
| A new runtime preset | `strict.json` |

**Never** extend `strict.json` directly in an app or library - use a runtime preset. **Never** fork a preset into an app; only override what you must (`types`, `paths`, `include`).

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

Run `make types` after changing `wrangler.jsonc` to regenerate `worker-configuration.d.ts` - do not hand-edit it. If the Worker uses `nodejs_compat`, add `"node"` to `compilerOptions.types` and install `@types/node`.

## Commands

| Command (from root or per-app) | Description |
|-------------------------------|-------------|
| `make check-types` | TypeScript across all packages (Turborepo) |
| `pnpm check-types:solution` | Solution build via `tsc -b` |

## Contribution

Preset changes are monorepo-wide - spot-check `worker-api`, `front-app`, and shared packages with `make check-types` from the repo root. See root [AGENTS.md](../../AGENTS.md).
