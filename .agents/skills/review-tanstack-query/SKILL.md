---
name: review-tanstack-query
description: "TanStack Query review (queryOptions patterns, cache hygiene, mutation flows, devtools) against current official TanStack Query best practices. USE WHEN: user runs /review-tanstack-query or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
---

# Review TanStack Query

Review the TanStack Query setup in `front-app` (and its consumption of `worker-api` over HTTP) for alignment with current official best practices - query organization, cache correctness, and developer experience on a React 19 SPA. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "mutations", "cache invalidation") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of TanStack Query may be outdated. **Do not draft suggestions from memory alone.**

1. Resolve "TanStack Query" via the **Context7 MCP** (`resolve-library-id` → `query-docs`) at v5: `queryOptions` pattern, `useSuspenseQuery`/`useInfiniteQuery` guidance, `placeholderData`/`initialData` semantics, invalidation strategies, `QueryClient` defaults.
2. Cross-check with local skill `.agents/skills/tanstack-query/SKILL.md`.
3. For anything Context7 lacks, use **Firecrawl search/scrape restricted to the official domain** (`tanstack.com/query`) - guides, reference, changelog for the installed minor.
4. Version currency: catalog entries (`@tanstack/react-query`, `-devtools`) in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) vs latest stable; flag deprecated v4-era APIs still present (`isFetching` misuse aside - look for removed options).
5. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [apps/front-app/src/services/](../../../apps/front-app/src/services/) (fetchers + `queryOptions` definitions), [apps/front-app/src/hooks/](../../../apps/front-app/src/hooks/)
- `QueryClient` instantiation/defaults and provider placement; router integration (loader ↔ queryClient)
- Devtools wiring (`@tanstack/react-query-devtools`, production gating)
- Correlation-id header propagation from SPA to gateway ([packages/correlation-id](../../../packages/correlation-id))

## Analysis axes

- **Query organization**: stable, hierarchical query keys; `queryOptions` factories co-located with services; no inline keys scattered across components.
- **Cache semantics**: deliberate `staleTime`/`gcTime` per data type (not all-default); no `cacheTime` v4 leftovers; structural sharing intact; optimistic updates with rollback handled via current mutation APIs.
- **Invalidation & mutations**: targeted `invalidateQueries` predicates; mutation → refetch flows correct; error handling surfaced to UI consistently.
- **Loading UX**: Suspense-based reads where idiomatic (`useSuspenseQuery`) vs classic hooks; no request waterfalls from sequential dependent queries that could be parallel or prefetched in route loaders.
- **Transport**: typed fetch wrapper against DTOs from `@repo/dtos-common`; correlation id attached; base URL from env only.
- **Devtools**: mounted only outside production; version aligned with runtime.

## DX & AI-agentic workflow

Verify agent-friendliness: adding a query follows one documented pattern (service + `queryOptions` + hook); fast verification loop via front-app tests (see `front-vitest` skill for RTL/query harness conventions).

## Steps

1. Collect ground truth before reading code.
2. Read services/hooks end-to-end; trace one query from loader through component.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - broken cache assumptions, unhandled mutation errors, stale/deprecated API breakage risk.
2. **Improvements** - key/staleTime/loader alignment with current guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
