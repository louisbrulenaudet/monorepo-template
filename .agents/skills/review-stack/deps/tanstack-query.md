---
id: tanstack-query
summary: queryOptions, cache semantics, mutations, devtools
families: [frontend, tanstack]
packages: [@tanstack/react-query, @tanstack/react-query-devtools]
paths: [apps/front-*/src/services/**, apps/front-*/src/hooks/**, apps/front-*/src/config/query-client.ts, .claude/rules/frontend/tanstack-query.md]
---

# TanStack Query

TanStack Query in `front-app` and its consumption of `worker-api` over HTTP: query organization, cache correctness, and DX on a React 19 SPA.

## Ground truth

- **Collector**: "TanStack Query" at v5 - `queryOptions` pattern, `useSuspenseQuery`/`useInfiniteQuery` guidance, `placeholderData`/`initialData` semantics, invalidation strategies, `QueryClient` defaults.
- **Local skill**: `.agents/skills/tanstack-query/SKILL.md`.
- **Web fallback**: `tanstack.com/query` - guides, reference, changelog for the installed minor.
- **Version currency**: catalog `@tanstack/react-query`, `@tanstack/react-query-devtools` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); flag removed v4-era options still present.

## Scope

- [apps/front-app/src/services/](../../../../apps/front-app/src/services/) (fetchers + `queryOptions` definitions), [apps/front-app/src/hooks/](../../../../apps/front-app/src/hooks/)
- `QueryClient` instantiation/defaults and provider placement; router integration (loader ↔ queryClient)
- Devtools wiring (`@tanstack/react-query-devtools`, production gating)
- Request-id handling: the SPA reads the gateway's `X-Request-Id` response header into `FetchApiError` ([apps/front-app/src/utils/fetch-api.ts](../../../../apps/front-app/src/utils/fetch-api.ts)); `sentry-trace` / `baggage` carry the trace

## Probe

Read services/hooks end-to-end; trace one query from loader through component.

## Axes

- **Query organization**: stable, hierarchical query keys; `queryOptions` factories co-located with services; no inline keys scattered across components.
- **Cache semantics**: deliberate `staleTime`/`gcTime` per data type (not all-default); no `cacheTime` v4 leftovers; structural sharing intact; optimistic updates with rollback via current mutation APIs.
- **Invalidation & mutations**: targeted `invalidateQueries` predicates; mutation → refetch flows correct; errors surfaced to UI consistently.
- **Loading UX**: `useSuspenseQuery` where idiomatic vs classic hooks; no waterfalls from sequential dependent queries that could be parallel or prefetched in loaders.
- **Transport**: typed fetch wrapper against DTOs from `@repo/dtos-common`; no client-minted request id; base URL from env only.
- **Devtools**: mounted only outside production; version aligned with runtime.
- **Agent loop**: adding a query follows one documented pattern (service + `queryOptions` + hook); fast front-app test loop (skill `front-vitest` for the RTL/query harness).

## Critical when

Broken cache assumptions; unhandled mutation errors; stale or deprecated API breakage risk.

## Overlaps

Loader ↔ `ensureQueryData` composition is reviewed here; route-level loader placement and preload intent belong to `tanstack-router`.

## Accepted

- Patterns in [.claude/rules/frontend/tanstack-query.md](../../../../.claude/rules/frontend/tanstack-query.md).
- Devtools are lazy-loaded behind `import.meta.env.DEV` (see `quality/knip` rule).
