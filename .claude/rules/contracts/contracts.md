---
paths:
  - "packages/*-common/src/**"
  - "apps/**/src/dtos/**"
  - "apps/**/src/tools/**"
  - "apps/worker-*/src/routes/**"
  - "apps/front-*/src/services/**"
---

# Contract Rules

Zod 4 Mini (`import * as z from "zod/mini"`) is the house style for `@repo/dtos-common` and app boundary validation, for tree-shakable Worker and SPA bundles. If a framework schema slot mandates another validator, use it only inside that slot. `@repo/dtos-common` holds shapes and validation only, no business logic.

## Where a shape lives

A shape has exactly one owner: the narrowest scope that still contains every consumer. Define it there once and import it everywhere else; never copy it across a boundary.

- Crosses a workspace boundary (wire, queue, binding, or imported by more than one app/package) → `@repo/dtos-common`, in its layer directory.
- Used inside one app only (tool inputs, request/response envelopes, upstream payloads) → app-local, co-located and exported from the app's own DTO barrel. Promote it only when a second workspace needs it.
- UI-only view model → app-local, but validate the raw wire payload with the shared schema before mapping it; a view model never replaces the wire contract.

The test is reach, not similarity: look-alike shapes that never cross the same boundary stay separate; a shape consumed on both sides of a boundary moves up. Never mix layers in one file (an HTTP response schema belongs in `api/` even when an `rpc/` shape looks similar).

| Layer | Import | Shape rules | Consumer validation |
|-------|--------|-------------|---------------------|
| HTTP REST | `@repo/dtos-common/api` | JSON-safe types only (no `Date` on the wire) | `validator()` in `worker-api`, `fetchJsonWithSchema` in `front-app` |
| RPC | `@repo/dtos-common/rpc` | service-binding shapes; may use `z.coerce.date()` or ISO strings and richer joined read models not exposed on public HTTP | parse at the binding boundary before business logic |
| Queue | `@repo/dtos-common/queue` | durable job payloads; version carefully once several producers or consumers exist; `…MessageSchema` | parse in `handlers/message.ts` (or equivalent) |
| Webhook | `@repo/dtos-common/webhook` | third-party event bodies; `…EventSchema` | parse at the `webhook-*` route/handler entry, before handing off to business workers |

Only `api` is in `package.json` `exports` today; the first schema of another layer adds its entry ([packages/dtos-common/AGENTS.md](../../../packages/dtos-common/AGENTS.md)).

## Naming and inference

- Schema exports end in `Schema` / `RequestSchema` / `ResponseSchema` / `InputSchema` / `PayloadSchema` / `MessageSchema` / `EventSchema`.
- Derive every type from its schema (`export type ExampleInput = z.infer<typeof ExampleInputSchema>`). All inferred types sit at the bottom of the file, after every schema, never interleaved. The type drops the `Schema` suffix and never takes a `Type` suffix (`ExampleInputType` is forbidden).
- Never hand-write an `interface` / `type`, a `types.ts` file, or a parallel interface for a shape Zod or Drizzle already defines; DB row types come from the Drizzle table. Allowed: app-local types that never cross a package boundary, and mapping helpers between inferred types (e.g. an output projection).
- Keep schemas lean: constrained members live in `z.enum(ValueSet)` / `z.enum([...] as const)`, never also spelled out in `.describe()` prose. Per-corpus planning guidance goes inline in the tool `description` and input `.describe()` text; there is no separate discovery catalog.

## Constrained string sets (`@repo/enums-common`)

Same reach test. A value set is shared when any of these holds: more than one app or package uses it; it travels over the wire; a shared DTO schema references it; concerns that must agree on it share it (e.g. auth scopes read by auth and gateway code). Otherwise it stays app-local (one app, or UI-only with no API meaning). Default to local; promote on the second consumer.

- One value set per kebab-case file, re-exported up the barrel chain to the package root; a new public subpath gets its `package.json` export.
- Wire-safe values are an `as const` object plus a derived type - never `export enum` (`erasableSyntaxOnly`) or a parallel string-literal union. Schemas reference them with `z.enum(ValueSet)` (full set) or `z.enum([...] as const)` (subset), never re-typed literals; code imports members from the const object, not raw strings.
- Changing a member's serialized string value is a breaking contract change. Adding a member, or renaming a key whose wire value is unchanged, is safe. Changing a wire value (coordinate DTO + API + UI) or removing a member (version the API) is not. Update every consumer in the same PR.

## Schema authoring

- Unknown keys: one policy per file or feature - if one schema uses `.strict()`, the others in the file follow rather than mixing silently.
- Cross-field rules go in `.refine()` / `.superRefine()`, with messages safe to return to an API client (no internal paths, stack details, or secret values).
- `.safeParse()` when you branch on a structured failure (the norm at trust boundaries here); `.parse()` only where the throw is caught in a controlled context.

## Change workflow

1. Edit `packages/dtos-common/src/<layer>/<feature>.ts` and export it from `src/<layer>/index.ts`.
2. Update every producer and consumer of that layer in the same PR; an `api/` change also updates `worker-api` route validation and `front-app` parsing and forms.
3. `pnpm check-types`.

Prefer additive changes. For a breaking one, version deliberately (new route, queue message version field, new RPC method) and migrate.
