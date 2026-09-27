---
id: tanstack-router
summary: route tree, typed search params, loaders, splitting
families: [frontend, tanstack]
packages: [@tanstack/react-router, @tanstack/router-plugin, @tanstack/router-cli, @tanstack/react-router-devtools]
paths: [apps/front-*/src/routes/**, apps/front-*/tsr.config.json, .claude/rules/frontend/tanstack-router.md]
---

# TanStack Router

TanStack Router in `front-app`: route-tree generation, type-safe search params, loading/preloading strategy, and DX on a React 19 SPA deployed via Cloudflare.

## Ground truth

- **Stale-knowledge risk**: frequent minor releases.
- **Collector**: "TanStack Router" - file-based routing conventions, `createFileRoute`/route APIs at the installed version, search-param validation with Zod, code splitting/`lazyRouteComponent` patterns, devtools.
- **Local skill**: `.agents/skills/tanstack-router/SKILL.md`.
- **Web fallback**: `tanstack.com/router` - guides and changelog.
- **Version currency**: catalog `@tanstack/react-router`, `@tanstack/router-plugin`, `@tanstack/router-cli`, `@tanstack/react-router-devtools` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); plugin/runtime version skew is a classic drift point.

## Scope

- Route files under [apps/front-app/src/routes/](../../../../apps/front-app/src/routes/) and the generated route tree
- [apps/front-app/tsr.config.json](../../../../apps/front-app/tsr.config.json), router-plugin options in [apps/front-app/vite.config.ts](../../../../apps/front-app/vite.config.ts)
- `@tanstack/router-cli` generate task in package scripts; generated-file ignore policy (oxlint/knip/git)
- Devtools wiring (`@tanstack/react-router-devtools`)

## Probe

Read tsr config, vite plugin options, and every route file.

## Axes

- **Route-tree generation**: generator config current; generated file committed/ignored per repo policy and excluded from lint/format noise; regeneration wired into dev/build reliably.
- **Type safety**: `validateSearch` with Zod schemas shared with DTOs where applicable; fully typed `Link`/`navigate`; no `as any` around params.
- **Loading & data**: loaders vs TanStack Query composition (`ensureQueryData` or deferring); Suspense/error boundaries per route; no waterfall-prone sequential awaits.
- **Code splitting & preloading**: route-level lazy chunks; `preload` intent sensible; router stale-time vs query cache interplay understood.
- **Devtools**: gated out of production; version aligned with runtime.
- **Version currency**: breaking changes between pin and latest noted when relevant to used APIs.
- **Agent loop**: adding a route is documented in nested AGENTS.md; generated artifacts never hand-edited; route-tree type errors actionable via `turbo run check-types --filter=front-app`.

## Critical when

Broken generation; untyped or unvalidated params reaching logic; plugin/runtime mismatch.

## Overlaps

Query cache semantics belong to `tanstack-query`; chunk output and plugin ordering in `vite.config.ts` belong to `vite`.

## Accepted

- Patterns in [.claude/rules/frontend/tanstack-router.md](../../../../.claude/rules/frontend/tanstack-router.md); `routeTree.gen.ts` is generated and never reviewed line by line.
