# @repo/dtos-common Agent Instructions

## Overview

**Single source of truth** for validated wire shapes across communication layers, consumed by Workers, gateways, and (for HTTP) `front-app`. Schema changes are **contract changes**: layers, naming, inference, authoring, and the change workflow are rule `contracts/contracts` (loads with `src/**`).

Import through the layer subpath (`@repo/dtos-common/api`, …). The package has no root entry: add a `"."` export only once something needs to import the root.

## Structure

```
packages/dtos-common/
├── src/
│   └── api/
│       ├── <feature>.ts    # Schemas per feature (kebab-case)
│       └── index.ts        # Named re-exports
```

One feature file per concern within a layer.

## Where to Change Things

| Task | Location |
|------|---------|
| New HTTP endpoint schemas | `src/api/<feature>.ts` → named export in `src/api/index.ts` (the only layer in `package.json` `exports` today) |
| New RPC method schemas | `src/rpc/<feature>.ts` → `src/rpc/index.ts` → add `"./rpc"` to `package.json` `exports` |
| New queue message schemas | `src/queue/<feature>.ts` → `src/queue/index.ts` → add `"./queue"` to `package.json` `exports` |
| New webhook payload schemas | `src/webhook/<feature>.ts` → `src/webhook/index.ts` → add `"./webhook"` to `package.json` `exports` |
