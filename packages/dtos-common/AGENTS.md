# @repo/dtos-common Agent Instructions

## Overview

**Single source of truth** for validated wire shapes across communication layers. Consumed by Workers, gateways, and (for HTTP) `front-app`.

| Layer | Subpath | Boundary | Public today |
|-------|---------|----------|--------------|
| **HTTP REST** | `@repo/dtos-common/api` | `front-app` ↔ `worker-api` over HTTP | Yes (`package.json` `exports`) |
| **RPC** | `@repo/dtos-common/rpc` | Worker-to-Worker **service bindings** | Add `exports` with the first schema |
| **Queue** | `@repo/dtos-common/queue` | Queue producer/consumer message bodies | Add `exports` with the first schema |
| **Webhook** | `@repo/dtos-common/webhook` | Inbound webhook payloads (`webhook-*` workers) | Add `exports` with the first schema |

Schemas use Zod Mini (`import * as z from "zod/mini"`) for tree-shakable Worker and SPA bundles.

Schema changes are **contract changes**. Layer notes, consumer expectations, Zod authoring, and the full change workflow: rule `contracts/contracts` (loads with `src/**`).

Import through the layer subpath (`@repo/dtos-common/api`, etc.). The package has no root entry (`@repo/dtos-common`): add a `"."` export only once something needs to import the root.

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
| New HTTP endpoint schemas | `src/api/<feature>.ts` → named export in `src/api/index.ts` |
| New RPC method schemas | `src/rpc/<feature>.ts` → `src/rpc/index.ts` → add `"./rpc"` to `package.json` `exports` |
| New queue message schemas | `src/queue/<feature>.ts` → `src/queue/index.ts` → add `"./queue"` to `package.json` `exports` |
| New webhook payload schemas | `src/webhook/<feature>.ts` → `src/webhook/index.ts` → add `"./webhook"` to `package.json` `exports` |

## Contract Change Workflow

1. Edit the schema in `src/<layer>/<feature>.ts`.
2. Named-export it from `src/<layer>/index.ts` (and add `package.json` `exports` if this is the first schema in that layer).
3. Update every producer and consumer of that layer in the **same PR** (`api/` → `worker-api` + `front-app`).
4. `pnpm check-types`.

Prefer additive changes.
