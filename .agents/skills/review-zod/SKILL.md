---
name: review-zod
description: "Zod review (v4 adoption across @repo/dtos-common boundaries, schema organization, parse strategies) against current official Zod best practices. USE WHEN: user runs /review-zod or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review Zod

Review Zod usage across contract boundaries (`@repo/dtos-common`, HTTP routes, SPA clients, queue/webhook payloads) for alignment with current official Zod v4 best practices - schema organization, typing, and parse performance. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "dtos-common only", "error formatting") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of Zod may be outdated (v3 → v4 changed APIs and error internals significantly). **Do not draft suggestions from memory alone.**

1. Resolve "Zod" via the **installed documentation MCP collector** (whatever documentation MCP server(s) this project registers - library resolvers, vendor doc servers) at v4: top-level APIs, `.safeParse`/`.parse` semantics, `z.output`/`z.input` inference, discriminated unions, registries/metadata features, error customization, tree-shaking/minification notes.
2. For anything the collector cannot resolve or lacks, **complete context collection with a direct web fetch** restricted to the official domain (`zod.dev`) - v4 changelog/migration notes relevant to schemas in this repo. Use whichever web fetch/search tools are available.
3. Version currency: catalog `zod` in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) and installed version vs latest stable; flag any remaining v3-only APIs (e.g. old error-map patterns) in code.
4. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [packages/dtos-common/src/](../../../packages/dtos-common/src/) - `api/`, `rpc/`, `queue/`, `webhook/` schema folders
- Consumers: [apps/worker-api/src/routes/](../../../apps/worker-api/src/routes/) (validation middleware), front-app services decoding responses
- [.claude/rules/contracts/](../../../.claude/rules/contracts/) ↔ `.cursor/rules/contracts/` ownership conventions
- Tests asserting schema contracts under `packages/dtos-common` and app tests

## Analysis axes

- **Single source of truth**: every cross-boundary payload has exactly one owning schema in `dtos-common`; no shadow re-declarations in apps; enums sourced from `@repo/enums-common`.
- **Inference discipline**: types derived via `z.infer`/`z.output` (input vs output distinction respected); no hand-written duplicate TS types drifting from schemas.
- **Boundary coverage**: all Hono routes validate request/response payloads; webhook signatures verified before parsing; queue messages validated on consume.
- **Schema quality**: discriminated unions over boolean flags; `.strict()`/`.loose()` choices deliberate; reusable primitives factored; no runtime-costly transforms on hot paths where a refine suffices.
- **Errors**: consistent error formatting for API responses (no internal details leaked); i18n/custom messages pattern coherent with current v4 APIs.
- **Version currency**: full v4 adoption (no compat shims); new capabilities worth adopting noted.

## DX & AI-agentic workflow

Verify agent-friendliness: adding a contract is a documented procedure (schema folder → route → SPA service updated together per AGENTS.md); generated types flow through `turbo run check-types` so agents get fast feedback.

## Steps

1. Collect ground truth before reading code.
2. Read dtos-common structure and trace one schema end-to-end (worker validation → SPA consumption).
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - unvalidated boundary, schema/type drift, leaked internals in errors.
2. **Improvements** - organization/inference alignment with v4 guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
