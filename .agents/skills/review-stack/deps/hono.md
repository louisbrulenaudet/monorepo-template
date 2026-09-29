---
id: hono
summary: worker-api routing, middleware order, validation, errors
families: [workers]
packages: [hono, @hono/zod-validator, @hono/cli]
paths: [apps/worker-api/src/**, packages/hono-middleware/**, .claude/rules/backend/hono-gateway.md]
---

# Hono

Hono in `worker-api` (and any future HTTP-surface Worker) on Cloudflare Workers: routing structure, middleware composition, validation, and error handling.

## Ground truth

- **Collector**: "Hono" - routing patterns, middleware ordering semantics, validators/Zod integration helpers, error handling (`HTTPException`, `onError`), Cloudflare Workers adapters/helpers, RPC/`hc` client typing if referenced.
- **Local skill**: `.agents/skills/hono/SKILL.md`.
- **Web fallback**: `hono.dev` - guides and API reference pages relevant to findings.
- **Version currency**: catalog `hono` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml) and installed version; flag deprecated APIs in code (e.g. old validator helpers).

## Scope

- [apps/worker-api/src/index.ts](../../../../apps/worker-api/src/index.ts) and [apps/worker-api/src/routes/](../../../../apps/worker-api/src/routes/)
- Contracts in [packages/dtos-common/](../../../../packages/dtos-common/) (`api/`, Zod schemas at boundaries)
- Request-id middleware ([packages/hono-middleware/src/request-id.ts](../../../../packages/hono-middleware/src/request-id.ts), `X-Request-Id`)
- [apps/worker-api/AGENTS.md](../../../../apps/worker-api/AGENTS.md); CORS/body-limit/security middleware configuration
- Route tests under `apps/worker-api/tests/`

## Probe

Read `index.ts` and every route file; trace one request through the middleware chain.

## Axes

- **Routing structure**: feature routers composed under a minimal `index.ts`; path naming consistent; 404 handling explicit.
- **Middleware order**: request-id → CORS → body limits → routes → error handler, checked against current Hono semantics; async middleware awaited (no floating promises).
- **Validation**: every route validates input/output with `@repo/dtos-common` schemas; no ad-hoc parsing at boundaries; status codes typed.
- **Error handling**: centralized `onError`/`HTTPException`; no internals leaked; consistent JSON error envelope.
- **Workers fit**: no Node-only APIs; streaming handled correctly where present; no blocking work on hot paths.
- **Version currency**: deprecated helpers replaced; built-in middleware adopted where it removes hand-rolled code.
- **Agent loop**: contract-first loop documented (DTOs → routes → SPA client together); route tests runnable per app; new endpoints reflected in nested AGENTS.md.

## Critical when

Security-relevant middleware gaps; unvalidated inputs; leaked internals.

## Overlaps

Schema design and inference belong to `zod`; `cloudflare.config.ts` bindings and modes belong to `cf`; the `sentry(...)` options belong to `sentry` (its position in the chain stays here).

## Accepted

- Middleware order and each middleware's rationale in [.claude/rules/backend/hono-gateway.md](../../../../.claude/rules/backend/hono-gateway.md).
