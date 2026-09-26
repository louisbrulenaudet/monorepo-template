# @repo/typescript-config Agent Instructions

## Overview

`@repo/typescript-config` provides **shared TypeScript configuration presets** for the entire monorepo. All Workers apps, React/Vite apps, and shared libraries extend one of these presets - never copy-paste compiler options.

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

## Preset selection

The preset table, the strict flags that change how you write code, and the editing rules live in rule `quality/typescript-config`. A package's `tests/tsconfig.json` appends the `tests.json` mixin last:

```jsonc
// packages/<pkg>/tests/tsconfig.json
{ "extends": ["../tsconfig.json", "@repo/typescript-config/tests.json"] }
```

If a Worker-only shared library later needs different options (e.g. real Worker globals), add a dedicated preset then - do not fork `workers.json` or `library.json` into the package.

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

## Contribution

Preset changes are monorepo-wide: run `pnpm check-types` from the repo root before merging.
