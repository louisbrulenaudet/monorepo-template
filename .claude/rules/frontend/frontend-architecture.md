---
paths:
  - "apps/front-*/src/**/*.{ts,tsx,css}"
  - "apps/front-*/index.html"
---

# Frontend Architecture (Vite + React) Rules

Cross-cutting scaffolding for the React SPAs. Component/hook authoring is in [react.md](react.md); server state in [tanstack-query.md](tanstack-query.md); routing in [tanstack-router.md](tanstack-router.md). This file is the wiring between them.

## Directory layout

- Thin route shells under `src/routes/` (file-based - see [tanstack-router.md](tanstack-router.md)) hold loaders, guards, and search validation; the code-split UI entry is the paired `src/routes/*.lazy.tsx`, and the actual screen lives in `src/pages/` (imported by the lazy route). Shared UI sits in `src/components/` (with primitives in `src/components/ui/`); non-render logic in `src/hooks/`, `src/services/`, `src/utils/`; frontend-only enums in `src/enums/`; runtime config in `src/config/` (`env.ts`, `query-client.ts`).
- HTTP calls and their `queryOptions` live together under `src/services/worker-api/` (`<feature>.ts` + `<feature>-query-options.ts`). Wire schemas are **not** redefined here - they come from `@repo/dtos-common`.
- Colocate feature code (route + its queries + its components) over deep global folders. Reuse the existing path aliases - `@/*` plus the app-specific ones (`@utils`, `@enums`, `@components`, `@ui`, `@routes`, `@pages`, `@hooks`, `@services`, `@config`) - declared in `tsconfig.json` **and** `vite.config.ts`; keep the two in sync (see [vite-config.md](vite-config.md) when editing aliases).
- Filenames stay kebab-case; a React component file may be PascalCase to mirror its export. See [naming.md](../quality/naming.md).

## Vite config

- When editing `vite.config.ts`, follow [vite-config.md](vite-config.md) - plugin order, Rolldown/Oxc build options, monorepo `fs.allow`, env guards, and generated `dist/_headers`.
- Hook rules (`react/rules-of-hooks`, `react/exhaustive-deps`) are enforced by **oxlint**, not ESLint - they are configured for `apps/front-*/src/**` in `.oxlintrc.json`. Do not add an ESLint/`eslint-plugin-react-hooks` toolchain; `make ci` runs oxlint.

## Cloudflare Workers deployment

- These SPAs deploy as **static assets + SPA routing on Cloudflare Workers** - `@cloudflare/vite-plugin` in `vite.config.ts`, deploy settings in `wrangler.jsonc`. Router/query devtools stay dev-only (see below).

## Tailwind v4

Styling has its own path-scoped rule: [tailwind.md](tailwind.md) - engine/entry, `@source` detection, `@theme` vs `:root` tokens, semantic dark-mode tokens, `@apply`/`@utility`, static-string classes, and the enforced `better-tailwindcss` lint set. Motion/transitions → **`ui-ux-design-best-practices`** skill.

## App entry & providers

- Compose providers at the root once, outermost first: `<QueryClientProvider>` → `<RouterProvider>`, with a top-level **error boundary** and route-level `<Suspense>`/pending components for loading states.
- Create the `QueryClient` (module singleton) and the `router` (with `queryClient` + auth in context) at module scope; pass runtime values (e.g. resolved auth) through `<RouterProvider context={...}>`. See the integration section in [tanstack-router.md](tanstack-router.md).
- Mount all devtools (`ReactQueryDevtools`, router devtools) **dev-only** behind `import.meta.env.DEV` so they are tree-shaken from production.

## Bundle & code splitting

- Rely on the router's `autoCodeSplitting` for routes; use `React.lazy` + `<Suspense>` for heavy, rarely-used components (editors, charts) and defer non-critical third-party libs (analytics) until after first paint.
- Keep dynamic `import()` paths **statically analyzable** - literal paths (`() => import("./heavy")`) are safest. A partially dynamic path works only if it starts with `./`/`../`, ends with a file extension, and the variable is a single path segment (`` import(`./locales/${lang}.json`) ``); a fully dynamic `import(pathVariable)` cannot be chunked.
- **Avoid barrel-file imports** of large libraries (`import { X } from "big-lib"`) - import from the deep/direct path so Rollup's production tree-shaking can drop unused exports. (`optimizeDeps` only tunes the **dev-server** pre-bundler; it does not reduce the production bundle.) Preload heavy chunks on user intent (`onMouseEnter`/`onFocus` → `void import("./heavy")`).

## Environment & boundaries

- Client env comes from `import.meta.env` and must be prefixed **`VITE_`** to be exposed; it is **inlined into the public bundle** - never put a secret there. Read it through `src/config/env.ts` with a fallback, not scattered `import.meta.env.X` reads.
- The SPA talks to backends over **HTTP only** (never Worker service bindings); keep credentials and privileged calls server-side. See [guardrails.md](../core/guardrails.md).
- Validate every response at the boundary with the **shared** schema (`@repo/dtos-common`) before mapping into a local view model - one source of truth for wire shapes, never redefined client-side. See [contracts.md](../contracts/contracts.md) / [type-inference.md](../contracts/type-inference.md).
- `routeTree.gen.ts` is a generated artifact: never hand-edit it - the router plugin regenerates it on dev/build. In this repo it is **committed** (and excluded from lint/format via `.oxlintrc.json` / `.oxfmtrc.json`); other Vite build output under `dist/**` stays out of version control (see [guardrails.md](../core/guardrails.md)).

## Before finishing

Run `make ci`, then build the app (`pnpm --filter front-app run build`, or `make build` from the repo root) to confirm the bundle compiles and chunks resolve. Keep every Oxc rule green (see [code-style.md](../quality/code-style.md)).
