# @repo/dtos-common Agent Instructions

## Overview

**Single source of truth** for validated wire shapes across communication layers. Consumed by Workers, gateways, and (for HTTP) `front-app`.

| Layer | Subpath | Boundary |
|-------|---------|----------|
| **HTTP REST** | `@repo/dtos-common/api` | `front-app` ↔ `worker-api` over HTTP |
| **RPC** | `@repo/dtos-common/rpc` | Worker-to-Worker **service bindings** |
| **Queue** | `@repo/dtos-common/queue` | Queue producer/consumer message bodies |
| **Webhook** | `@repo/dtos-common/webhook` | Inbound webhook payloads (`webhook-*` workers) |

Schema changes are **contract changes**. Layer notes, consumer expectations, Zod authoring, and the full change workflow load from `.claude/rules/contracts/` or `.cursor/rules/contracts/` when editing `src/**`.

## Structure

```
packages/dtos-common/
├── src/
│   ├── api/
│   │   ├── <feature>.ts    # Schemas per feature (kebab-case)
│   │   └── index.ts
│   ├── rpc/
│   ├── queue/
│   ├── webhook/
│   └── index.ts            # Package entry - re-exports `api/` (extend when other layers have schemas)
```

Import via subpath: `@repo/dtos-common/api`, `@repo/dtos-common/rpc`, `@repo/dtos-common/queue`, `@repo/dtos-common/webhook`. One feature file per concern within a layer.

## Where to Change Things

| Task | Location |
|------|---------|
| New HTTP endpoint schemas | `src/api/<feature>.ts` → `src/api/index.ts` |
| New RPC method schemas | `src/rpc/<feature>.ts` → `src/rpc/index.ts` |
| New queue message schemas | `src/queue/<feature>.ts` → `src/queue/index.ts` |
| New webhook payload schemas | `src/webhook/<feature>.ts` → `src/webhook/index.ts` |
| New public subpath | Add `"./<layer>"` to `package.json` `exports` when introducing a layer |

## Contract Change Workflow

1. Edit the schema in `src/<layer>/<feature>.ts`.
2. Export from `src/<layer>/index.ts`.
3. Update every producer and consumer of that layer in the **same PR** (`api/` → `worker-api` + `front-app`).
4. `make check-types`.

Prefer additive changes. Full workflow and layer rules: `contracts/contracts`.

## Commands

| Command | Description |
|---------|-------------|
| `make format` / `make lint` / `make check` | OXC |
| `make check-types` | TypeScript |

## Contribution

Coordinate wire-format changes with all consumers in the same PR. See root [AGENTS.md](../../AGENTS.md).
