---
paths:
  - "apps/front-*/src/**/*.{ts,tsx}"
---

# TanStack Router (v1) Rules

TanStack Router (`@tanstack/react-router` v1) owns client-side routing, route data, and URL state. This is a client SPA — ignore all TanStack Start / SSR / server-function / streaming features. For deep guidance load the **`tanstack-router`** skill.

## Setup & the generated tree

- Use **file-based routing** via the Vite plugin — `import { tanstackRouter } from "@tanstack/router-plugin/vite"`, configured as `tanstackRouter({ target: "react", autoCodeSplitting: true })` and placed **before** `@vitejs/plugin-react` in `plugins` (Vite wiring lives in [frontend-architecture.md](frontend-architecture.md)). Reserve code-based routing for programmatic/virtual trees only.
- **`routeTree.gen.ts` is a generated artifact** — the plugin regenerates it on dev/build. Never hand-edit it. In this repo it is **committed** and excluded from lint/format (`.oxlintrc.json` / `.oxfmtrc.json`); a hand-authored change to it is a build-config bug, not a source change (see [guardrails.md](guardrails.md)).
- Register the router type once for global inference — without this, all `to`/`params`/`search` type safety silently degrades:
  ```ts
  declare module "@tanstack/react-router" {
    interface Register {
      router: typeof router;
    }
  }
  ```
- Create exactly one `router` and render one `<RouterProvider router={router} />`. Set `defaultPreload: "intent"` and `scrollRestoration: true`.

## Routes & file conventions

- Define each route with `createFileRoute("/path")({...})`; the root with `createRootRouteWithContext<{...}>()` (see context below). Export it as `Route`.
- Conventions in `src/routes/`: `index.tsx` → index; `$param.tsx` → dynamic segment; `_pathless.tsx` / `_layout/` → layout route that adds nesting/UI **without** a URL segment; `(group)/` → grouping with no URL impact; `$.tsx` → splat.
- Keep route files thin: route config + colocated route-specific UI. Prefer the route's own bound hooks — `Route.useSearch()`, `Route.useParams()`, `Route.useLoaderData()` — over the free hooks with `{ from }`.

## Type-safe navigation & search params

- Navigate only with typed `<Link to="/posts/$postId" params={{ postId }}>` and the typed `useNavigate()`. Never hand-build URL strings or use raw `<a href>` for internal routes.
- Treat **search params as first-class typed state**: validate with `validateSearch` against a schema (Zod), read with `Route.useSearch()`, and update immutably (`search={(prev) => ({ ...prev, page })}`). Never read/mutate `window.location.search`. Always parse to a concrete schema **with defaults** so downstream types are non-optional.
- When a `loader` depends on search params, add `loaderDeps: ({ search }) => ({ ... })` — otherwise the loader won't re-run on search changes and serves stale data.

## Data loading, context & auth

- Load route data in `loader`s, not `useEffect`. Tune `staleTime`/`gcTime` per route. In this repo, loaders should delegate to TanStack Query (below) rather than fetch directly.
- Inject cross-cutting deps (`queryClient`, auth) through **router context** via `createRootRouteWithContext<{...}>()`, passed in `createRouter({ context })` and/or `<RouterProvider context={...}>`.
- Put auth guards and redirects in **`beforeLoad`**, never in component render (which flashes protected content first):
  ```tsx
  export const Route = createFileRoute("/_authenticated")({
    beforeLoad: ({ context, location }) => {
      if (!context.auth.isAuthenticated) {
        throw redirect({ to: "/login", search: { redirect: location.href } });
      }
    },
  });
  ```
- Throw `notFound()` from a loader instead of conditionally rendering "not found".

## States & code splitting

- Handle errors/pending/404 at both levels: router `defaultErrorComponent` / `defaultPendingComponent` / `defaultNotFoundComponent`, plus per-route `errorComponent` / `pendingComponent` / `notFoundComponent`.
- Rely on `autoCodeSplitting: true` for automatic splitting; use `.lazy.tsx` route files only for manual splits (keep `loader`/`beforeLoad`/`validateSearch` in the eager file, the component in the lazy file).
- This repo uses a three-layer split per route: the eager shell `src/routes/<path>.tsx` (`createFileRoute`, loaders, guards) → the code-split `src/routes/<path>.lazy.tsx` (`createLazyFileRoute` with `component`/`pendingComponent`/`errorComponent`) → the screen in `src/pages/<PageName>.tsx` imported by the lazy route. Keep route files thin; grow the UI in `src/pages/`, not in routing plumbing.

## TanStack Query integration (canonical)

- Put `queryClient` in root context: `createRootRouteWithContext<{ queryClient: QueryClient }>()` + `createRouter({ context: { queryClient } })`, and wrap the app in `<QueryClientProvider>`.
- In loaders, warm the cache: `context.queryClient.ensureQueryData(queryOptions(...))`. In components, read the **same** `queryOptions` object with `useSuspenseQuery(...)` so the loader guarantees warm data and the component stays reactive. See [tanstack-query.md](tanstack-query.md).
  ```tsx
  export const Route = createFileRoute("/posts/$id")({
    loader: ({ context: { queryClient }, params: { id } }) =>
      queryClient.ensureQueryData(postDetailQuery(Number(id))),
    component: PostDetail,
  });
  ```
- Set **`defaultPreloadStaleTime: 0`** on the router so freshness is governed by Query's `staleTime`, not the router's separate preload cache. This is the most common Router+Query misconfiguration — get it right.

## Before finishing

Run `make ci`. Confirm `routeTree.gen.ts` is regenerated (not hand-edited) and committed, and keep every Oxc rule green.
