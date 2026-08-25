---
name: review-tanstack-router
description: "TanStack Router review (file-based routing, route tree generation, typed search params, preload/lazy behavior) against current official TanStack Router best practices. USE WHEN: user runs /review-tanstack-router or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
---

# Review TanStack Router

Review the TanStack Router setup in `front-app` for alignment with current official best practices - route-tree generation, type-safe search params, loading/preloading strategy, and developer experience on a React 19 SPA deployed via Cloudflare. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "search params", "code splitting") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of TanStack Router may be outdated (frequent minor releases). **Do not draft suggestions from memory alone.**

1. Resolve "TanStack Router" via the **Context7 MCP** (`resolve-library-id` → `query-docs`): file-based routing conventions, `createFileRoute`/route APIs at the installed version, search-param validation with Zod, code-based splitting/`lazyRouteComponent` patterns, devtools.
2. Cross-check with local skill `.agents/skills/tanstack-router/SKILL.md` for repo-relevant depth.
3. For anything Context7 lacks, use **Firecrawl search/scrape restricted to the official domain** (`tanstack.com/router`) - guides and changelog.
4. Version currency: catalog entries (`@tanstack/react-router`, `@tanstack/router-plugin`, `@tanstack/router-cli`, `-devtools`) in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) vs latest stable; plugin and runtime version skew is a classic drift point.
5. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- Route files under [apps/front-app/src/routes/](../../../apps/front-app/src/routes/) and generated route tree artifact
- [apps/front-app/tsr.config.json](../../../apps/front-app/tsr.config.json), router-plugin options in [apps/front-app/vite.config.ts](../../../apps/front-app/vite.config.ts)
- CLI usage (`@tanstack/router-cli` generate task) in package scripts; generated-file ignore policy (oxlint/knip/git)
- Devtools wiring (`@tanstack/react-router-devtools`)

## Analysis axes

- **Route-tree generation**: generator config current; generated file committed/ignored per repo policy and excluded from lint/format noise; regeneration wired into dev/build reliably.
- **Type safety**: `validateSearch` with Zod schemas shared with DTOs where applicable; fully typed `Link`/`navigate` usage; no `as any` escapes around params.
- **Loading & data**: loaders used appropriately vs TanStack Query composition (loader awaiting queryClient.ensureQueryData or deferring); Suspense/error boundaries per route; no waterfall-prone sequential awaits.
- **Code splitting & preloading**: route-level lazy chunks; `preload` intent configuration sensible; default `gcTime`/stale-time interplay with query cache understood.
- **Devtools**: gated out of production builds; version aligned with runtime.
- **Version currency**: breaking changes between catalog pin and latest noted when relevant to used APIs.

## DX & AI-agentic workflow

Verify agent-friendliness: adding a route is a documented repeatable procedure (nested AGENTS.md); generated artifacts never hand-edited; type errors from the route tree actionable via `turbo run check-types --filter=front-app`.

## Steps

1. Collect ground truth before reading code.
2. Read tsr config + vite plugin options + all route files.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - broken generation, untyped/unvalidated params reaching logic, stale plugin/runtime mismatch.
2. **Improvements** - loader/splitting/search-param alignment with current guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
