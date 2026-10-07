---
paths:
  - "apps/front-*/src/**/*.{ts,tsx}"
  - "apps/front-*/index.html"
---

# React SPA (React 19 + Vite)

`front-*` apps are client-only Vite SPAs: no SSR, React Server Components, or `"use server"`; ignore React guidance framed around those. Targeted performance audit: skill `vercel-react-best-practices` (browser/client guidance only).

## Layout

- Screens live in `src/pages/`, thin route files in `src/routes/` ([tanstack-router.md](tanstack-router.md)); shared UI in `src/components/` (primitives in `src/components/ui/`); non-render logic in `src/hooks/`, `src/services/`, `src/utils/`; frontend-only value sets in `src/enums/`; runtime config in `src/config/`. HTTP calls pair with their `queryOptions` in `src/services/worker-api/<feature>.ts` + `<feature>-query-options.ts`.
- `components/ui/` holds primitives that import only `#/utils/*` and other primitives (lint-enforced by a `no-restricted-imports` override). A component that reads a hook, a service, or feature content lives in `src/components/<feature>/` beside that content (`health/`, `onboarding/`), and `components/feedback/` holds app-shell states only (error, not-found); `RouteErrorFallback` stays router-free, because the root `ErrorBoundary` renders it outside `RouterProvider`. Promote a feature to `src/features/<x>/` only once it spans two routes, updating the rule `paths:` globs in the same change, because they key on the layered folders.
- In-app absolute imports use the `package.json` `"imports"` map (`#/*` → `./src/*`, e.g. `#/components/ui/Button`) - never an `@/` alias, `resolve.alias`, or `compilerOptions.paths`.

## Components and hooks

- Never define a component (or a `memo` / `lazy` wrapper) inside another component's body; hoist it to module scope.
- **Never fetch in `useEffect`** or mirror query data into local state: server state is TanStack Query ([tanstack-query.md](tanstack-query.md)), and `react-doctor/no-fetch-in-effect` is a lint error. Derive during render rather than syncing props/state in `useEffect`; effects are only for external sync and clean up on unmount.
- React Compiler is on: do not default to `useMemo` / `useCallback` / `memo`; they are an escape hatch.
- `useTransition` / `startTransition` / `useDeferredValue` for non-urgent or expensive UI work.
- List keys use stable identity (`item.id`), never the index when order can change.
- `ref` is a normal prop (no new `forwardRef`). `use()` only with a stable cached promise under `<Suspense>`, never `use(fetch(...))` created during render.
- Hook rules (`react/rules-of-hooks`, `react/exhaustive-deps`) and `jsx-a11y` (partial a11y coverage) are oxlint rules; never add an ESLint / `eslint-plugin-react-hooks` toolchain.

## Entry, providers, bundle

- Providers compose once at the root, outermost first: `<QueryClientProvider>` → `<RouterProvider>`, with a top-level error boundary, route-level `<Suspense>` / pending components, error boundaries at tree and lazy-route edges, and route errors through the router's `errorComponent`.
- One module-singleton `QueryClient` in `src/config/query-client.ts` (never `new QueryClient()` in a component) and one `router` at module scope, with `queryClient` in its context today; pass further runtime values through `<RouterProvider context={...}>` when they exist. Auth, when added, belongs in route `beforeLoad` / context; never invent an auth field the app does not define.
- Devtools (`ReactQueryDevtools`, router devtools) mount dev-only behind `import.meta.env.DEV`, so production tree-shakes them.
- Routes split through the router's `autoCodeSplitting`; `React.lazy` + `<Suspense>` for heavy, rarely used components (editors, charts); defer non-critical third-party libraries (analytics) until after first paint; preload heavy chunks on intent (`onMouseEnter` / `onFocus` → `void import("./heavy")`).
- Keep `import()` statically analyzable: literal paths, or a partially dynamic path that starts with `./` / `../`, ends with a file extension, and varies one path segment (`` import(`./locales/${lang}.json`) ``); a fully dynamic `import(pathVariable)` cannot be chunked.
- Handle `vite:preloadError` in `src/main.tsx`: reload once per session (sessionStorage guard) so returning users recover from stale chunks after a deploy. **Never call `event.preventDefault()`**: the failed `import()` then resolves to `undefined`, and TanStack Router's `lazyRouteComponent` throws a `TypeError` instead of running its own once-per-chunk reload.
- Import large libraries from their deep path, not a barrel, so production tree-shaking drops unused exports (`optimizeDeps` only tunes the dev pre-bundler).
- Client env is `VITE_*` only and is inlined into the public bundle: never a secret. Read it through `src/config/env.ts` with a fallback, not scattered `import.meta.env.X` reads. Exception: `src/config/sentry.ts` reads `VITE_SENTRY_DSN` literally, so an unset DSN drops the SDK from the build.

## React Doctor

- After React changes, run `pnpm react-doctor:changed` and fix what it reports before calling the task done (deep workflow: skill `react-doctor`; config: [lint-config.md](../quality/lint-config.md)).
- The CLI's "not installed" banner (`react-doctor install --yes`) checks only the app's own `package.json`; the root `react-doctor` scripts are the install, so never run `react-doctor install`: it adds a duplicate skill, an `npx @latest` script, and a non-catalog dependency.
- Suppress inline only when justified: `// react-doctor-disable-next-line react-doctor/<rule>`. Never delete a correctness diagnostic to go green; run `pnpm react-doctor why <file>:<line>` when unclear.
