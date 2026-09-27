---
id: zod
summary: v4 schemas in dtos-common, inference, boundary coverage
families: [workers]
packages: [zod]
paths: [packages/dtos-common/**, packages/enums-common/**, .claude/rules/contracts/**]
---

# Zod

Zod v4 across contract boundaries (`@repo/dtos-common`, HTTP routes, SPA clients, queue/webhook payloads): schema organization, typing, and parse cost.

## Ground truth

- **Stale-knowledge risk**: v3 → v4 changed APIs and error internals significantly.
- **Collector**: "Zod" at v4 - top-level APIs, `.safeParse`/`.parse` semantics, `z.output`/`z.input` inference, discriminated unions, registries/metadata, error customization, tree-shaking notes.
- **Web fallback**: `zod.dev` - v4 changelog/migration notes relevant to schemas in this repo.
- **Version currency**: catalog `zod` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml) and installed version; flag v3-only APIs (old error-map patterns) in code.

## Scope

- [packages/dtos-common/src/](../../../../packages/dtos-common/src/) - `api/`, `rpc/`, `queue/`, `webhook/`
- Consumers: [apps/worker-api/src/routes/](../../../../apps/worker-api/src/routes/) (validation middleware), front-app services decoding responses
- [.claude/rules/contracts/](../../../../.claude/rules/contracts/) ↔ `.cursor/rules/contracts/` ownership conventions
- Schema contract tests in `packages/dtos-common` and app tests

## Probe

Read the dtos-common structure and trace one schema end-to-end (worker validation → SPA consumption).

## Axes

- **Single source of truth**: every cross-boundary payload has one owning schema in `dtos-common`; no shadow re-declarations; enums from `@repo/enums-common`.
- **Inference discipline**: types via `z.infer`/`z.output` (input vs output respected); no hand-written duplicate types.
- **Boundary coverage**: every Hono route validates request/response; webhook signatures verified before parsing; queue messages validated on consume.
- **Schema quality**: discriminated unions over boolean flags; deliberate `.strict()`/`.loose()`; reusable primitives factored; no costly transforms on hot paths where a refine suffices.
- **Errors**: consistent API error formatting without internals; custom messages coherent with v4 APIs.
- **Version currency**: full v4 adoption (no compat shims); new capabilities worth adopting.
- **Agent loop**: adding a contract is documented (schema folder → route → SPA service together); types flow through `turbo run check-types`.

## Critical when

Unvalidated boundary; schema/type drift; internals leaked in errors.

## Overlaps

Middleware placement of validators belongs to `hono`.

## Accepted

- Ownership and inference rules in [.claude/rules/contracts/](../../../../.claude/rules/contracts/).
