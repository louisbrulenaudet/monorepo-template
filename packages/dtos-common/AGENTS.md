# @repo/dtos-common Agent Instructions

## Overview

**Single source of truth** for validated wire shapes across communication layers. Consumed by Workers, gateways, and (for HTTP) `front-app`.

| Layer | Subpath | Boundary |
|-------|---------|----------|
| **HTTP REST** | `@repo/dtos-common/api` | `front-app` ↔ `worker-api` over HTTP |
| **RPC** | `@repo/dtos-common/rpc` | Worker-to-Worker **service bindings** |
| **Queue** | `@repo/dtos-common/queue` | Queue producer/consumer message bodies |
| **Webhook** | `@repo/dtos-common/webhook` | Inbound webhook payloads (`webhook-*` workers) |

Schema changes are **contract changes** for that layer. Rules load from `.claude/rules/contracts.md` when editing `src/**`.

## Structure

```
packages/dtos-common/
├── src/
│   ├── api/
│   │   ├── <feature>.ts    # Schemas per feature (kebab-case)
│   │   └── index.ts        # Named exports
│   ├── rpc/                # Service-binding RPC shapes (Date fields, joined read models)
│   │   ├── <feature>.ts
│   │   └── index.ts
│   ├── queue/
│   │   ├── <feature>.ts
│   │   └── index.ts
│   ├── webhook/
│   │   ├── <feature>.ts
│   │   └── index.ts
│   └── index.ts            # Package entry — re-exports `api/` (extend when other layers have schemas)
```

Import via subpath: `@repo/dtos-common/api`, `@repo/dtos-common/rpc`, `@repo/dtos-common/queue`, `@repo/dtos-common/webhook`.

One feature file per concern within a layer. Filenames are **kebab-case** (`health.ts`, `user-profile.ts`).

## Where to Put a Shape

| If the payload crosses… | Directory | Import from |
|-------------------------|-----------|-------------|
| HTTP between browser and `worker-api` | `src/api/<feature>.ts` | `@repo/dtos-common/api` |
| Service binding between Workers | `src/rpc/<feature>.ts` | `@repo/dtos-common/rpc` |
| A queue (producer → consumer) | `src/queue/<feature>.ts` | `@repo/dtos-common/queue` |
| An external webhook into `webhook-*` | `src/webhook/<feature>.ts` | `@repo/dtos-common/webhook` |

**Do not mix layers** in one file — e.g. an HTTP response schema belongs in `api/`, not `rpc/`, even if fields look similar.

### Layer notes

- **`api/`** — JSON-safe types only (no `Date` objects on the wire). Used with `zValidator` in `worker-api` and `fetchJsonWithSchema` in `front-app`.
- **`rpc/`** — Shapes passed through service bindings; may use `z.coerce.date()` or ISO strings for timestamps and richer joined read models not exposed on public HTTP.
- **`queue/`** — Durable/async job payloads; version carefully when multiple producers or consumers exist.
- **`webhook/`** — Third-party event bodies; validate at the `webhook-*` worker boundary before handing off to business workers.

## Where to Change Things

| Task | Location |
|------|---------|
| New HTTP endpoint schemas | `src/api/<feature>.ts` → `src/api/index.ts` |
| New RPC method schemas | `src/rpc/<feature>.ts` → `src/rpc/index.ts` |
| New queue message schemas | `src/queue/<feature>.ts` → `src/queue/index.ts` |
| New webhook payload schemas | `src/webhook/<feature>.ts` → `src/webhook/index.ts` |
| New public subpath | Add `"./<layer>"` to `package.json` `exports` when introducing a layer |

## Schema Naming

| Suffix | Use for |
|--------|---------|
| `Schema` | General structures |
| `RequestSchema` | Inbound payloads |
| `ResponseSchema` | Outbound payloads |
| `MessageSchema` | Queue message bodies (queue layer) |
| `EventSchema` | Webhook event payloads (webhook layer) |

Inferred types: same name **without** `Schema`; **never** a `Type` suffix. Declare all `z.infer<>` types **at the bottom of the file**.

```typescript
export const ExampleRequestSchema = z.object({ verbose: z.boolean().optional() });
export const ExampleResponseSchema = z.object({ status: z.string(), timestamp: z.string() });

export type ExampleRequest = z.infer<typeof ExampleRequestSchema>;
export type ExampleResponse = z.infer<typeof ExampleResponseSchema>;
```

## Consumer Expectations

| Layer | Typical consumer | Validation |
|-------|------------------|------------|
| `api` | `worker-api`, `front-app` | `zValidator`, `fetchJsonWithSchema` |
| `rpc` | Calling + called Worker | Parse at binding boundary before business logic |
| `queue` | Producer + consumer Worker | Parse in `handlers/message.ts` (or equivalent) |
| `webhook` | `webhook-*` worker | Parse at route/handler entry |

Never redefine these shapes in apps.

## Contract Change Workflow

1. Edit the schema in `src/<layer>/<feature>.ts`.
2. Export from `src/<layer>/index.ts`.
3. Update every producer and consumer of that layer in the **same PR**.
4. For `api/` changes: also update `worker-api` and `front-app`.
5. `make check-types`.

**Additive** changes preferred. **Breaking** changes need versioning (new route, queue message version field, or new RPC method) and coordinated migration.

## Zod Notes

- Shared constrained values from `@repo/enums-common`: `z.enum(Status)` for the full set, or `z.enum([Status.A, Status.B] as const)` for a subset — never duplicate string literals. Plain `string[]` without `as const` widens inference to `string`.
- Pick `.strict()` policy per file/feature and apply consistently.
- `.safeParse()` at trust boundaries; `.parse()` only in controlled throw contexts.
- No business logic in this package — shapes and validation only.

## Commands

| Command | Description |
|---------|-------------|
| `make format` / `make lint` / `make check` | OXC |
| `make check-types` | TypeScript |

## Contribution

Coordinate wire-format changes with all consumers in the same PR. See root [AGENTS.md](../../AGENTS.md) for monorepo conventions.
