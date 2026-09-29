# @repo/typescript-config Agent Instructions

## Overview

`@repo/typescript-config` provides the **shared TypeScript presets** for the whole monorepo: `strict.json`, `library.json`, `workers.json`, `vite-react.json`, `vite-node.json`, and the `tests.json` mixin. Every app and library extends one - never copy-paste compiler options. The preset table, deliberate omissions, and editing rules are rule `quality/typescript-config` (loads with this package and every `tsconfig*.json`); preset changes are monorepo-wide, so run `pnpm check-types` from the repo root before merging.

If a Worker-only shared library later needs different options (e.g. real Worker globals), add a dedicated preset then - never fork `workers.json` or `library.json` into the package.

## How to extend

```jsonc
// apps/worker-api/tsconfig.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@repo/typescript-config/workers.json",
  "compilerOptions": {
    "types": []
  },
  "include": ["src/**/*.ts", "cloudflare.config.ts", ".cloudflare/types"]
}
```

```jsonc
// packages/<pkg>/tests/tsconfig.json - the mixin goes last
{ "extends": ["../tsconfig.json", "@repo/typescript-config/tests.json"] }
```
