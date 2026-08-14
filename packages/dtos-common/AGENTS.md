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

Schema changes are **contract changes**. Layer notes, consumer expectations, Zod authoring, and the full change workflow load from `.claude/rules/contracts/` or `.cursor/rules/contracts/` when editing `src/**`.

Prefer subpath imports (`@repo/dtos-common/api`, etc.). The package root (`@repo/dtos-common`) re-exports `api/` only until other layers ship schemas.

## Structure

```
packages/dtos-common/
├── src/
│   ├── api/
│   │   ├── <feature>.ts    # Schemas per feature (kebab-case)
│   │   └── index.ts        # Named re-exports
│   ├── rpc/                # Scaffold until first schema + package.json export
│   ├── queue/
│   ├── webhook/
│   └── index.ts            # Package entry - re-exports `api/` (extend when other layers have schemas)
```

Import via the declared subpath for that layer. One feature file per concern within a layer. Do **not** add a `package.json` `exports` entry for `rpc` / `queue` / `webhook` until the first schema lands in that layer.

## Where to Change Things

| Task | Location |
|------|---------|
| New HTTP endpoint schemas | `src/api/<feature>.ts` → named export in `src/api/index.ts` |
| New RPC method schemas | `src/rpc/<feature>.ts` → `src/rpc/index.ts` → add `"./rpc"` to `package.json` `exports` |
| New queue message schemas | `src/queue/<feature>.ts` → `src/queue/index.ts` → add `"./queue"` to `package.json` `exports` |
| New webhook payload schemas | `src/webhook/<feature>.ts` → `src/webhook/index.ts` → add `"./webhook"` to `package.json` `exports` |
| New public subpath | Add `"./<layer>"` to `package.json` `exports` when introducing the **first** schema for that layer |

## Contract Change Workflow

1. Edit the schema in `src/<layer>/<feature>.ts`.
2. Named-export it from `src/<layer>/index.ts` (and add `package.json` `exports` if this is the first schema in that layer).
3. Update every producer and consumer of that layer in the **same PR** (`api/` → `worker-api` + `front-app`).
4. `pnpm check-types`.

Prefer additive changes. Full workflow and layer rules: `contracts/contracts`.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm format:fix` / `pnpm lint:fix` / `pnpm check` | OXC |
| `pnpm check-types` | TypeScript |

## Contribution

Coordinate wire-format changes with all consumers in the same PR. See root [AGENTS.md](../../AGENTS.md).
