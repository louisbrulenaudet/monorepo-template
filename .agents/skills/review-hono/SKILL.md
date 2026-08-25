---
name: review-hono
description: "Hono setup review (worker-api routing, middleware order, validation, error handling) against current official Hono best practices for Cloudflare Workers. USE WHEN: user runs /review-hono or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
---

# Review Hono

Review the Hono usage in `worker-api` (and any future HTTP-surface workers) for alignment with current official Hono best practices on Cloudflare Workers - routing structure, middleware composition, validation, and developer experience. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "middleware", "error handling") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of Hono may be outdated. **Do not draft suggestions from memory alone.**

1. Resolve "Hono" via the **Context7 MCP** (`resolve-library-id` → `query-docs`): routing patterns, middleware ordering semantics, validators/Zod integration helpers, error handling (`HTTPException`, `onError`), Cloudflare Workers adapters/helpers, RPC/`hc` client typing if referenced.
2. For anything Context7 lacks, use **Firecrawl search/scrape restricted to the official domain** (`hono.dev`) - guides and API reference pages relevant to findings.
3. Version currency: catalog `hono` in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) and installed version vs latest stable changelog; flag deprecated APIs used in code (e.g. old validator helpers).
4. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [apps/worker-api/src/index.ts](../../../apps/worker-api/src/index.ts) and [apps/worker-api/src/routes/](../../../apps/worker-api/src/routes/)
- Contracts in [packages/dtos-common/](../../../packages/dtos-common/) (`api/`, Zod schemas at boundaries)
- Correlation-id middleware wiring ([packages/correlation-id](../../../packages/correlation-id), `X-Request-Id`)
- [apps/worker-api/AGENTS.md](../../../apps/worker-api/AGENTS.md); CORS/body-limit/security middleware configuration
- Tests exercising routes under `apps/worker-api/tests/`

## Analysis axes

- **Routing structure**: feature routers composed under a minimal `index.ts` per repo convention; path naming consistent; 404/not-found handling explicit.
- **Middleware order**: global-first ordering (request-id → CORS → body limits → routes → error handler) verified against current Hono semantics; async middleware awaited (no floating promises).
- **Validation**: every route validates input/output with Zod schemas from `@repo/dtos-common`; no ad-hoc parsing at boundaries; status codes typed correctly.
- **Error handling**: centralized `onError`/`HTTPException` pattern; safe error responses (no internals leaked); consistent JSON error envelope.
- **Workers fit**: edge-safe usage (no Node-only APIs); streaming responses handled correctly where present; no blocking work on hot paths.
- **Version currency**: deprecated helpers replaced; new built-in middleware adopted where it removes hand-rolled code.

## DX & AI-agentic workflow

Verify agent-friendliness: contract-first loop documented (DTOs → routes → SPA client updated together); route tests runnable per-app so agents verify changes quickly; endpoint additions reflected in nested AGENTS.md per contribution policy.

## Steps

1. Collect ground truth before reading code.
2. Read index + all route files; trace one request through the middleware chain.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - security-relevant middleware gaps, unvalidated inputs, leaked internals.
2. **Improvements** - structural/validation alignment with current Hono guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
