---
paths:
  - "apps/front-*/src/**/*.{ts,tsx}"
---

# React (19) Component & Hook Rules

These apps are **client-only Vite SPAs** - no SSR, no React Server Components, no `"use server"`. Ignore general React guidance framed around those. For a targeted performance audit load **`vercel-react-best-practices`** (browser/client guidance only).

## Split of concerns

- **Server/async state** → [tanstack-query.md](tanstack-query.md). **Never** fetch in `useEffect`.
- **Routing / URL state** → [tanstack-router.md](tanstack-router.md).
- **Vite, providers, env, splitting** → [frontend-architecture.md](frontend-architecture.md).
- Naming → [naming.md](../quality/naming.md); lint → [code-style.md](../quality/code-style.md).

## Repo invariants

- Never define a component (or `memo`/`lazy` wrapper) inside another component's body - hoist to module scope.
- Prefer deriving during render over syncing props/state in `useEffect`. Effects only for external sync; clean up on unmount.
- **React Compiler on** (see frontend-architecture): do **not** default to `useMemo`/`useCallback`/`memo`. Escape hatch only when needed.
- Prefer `useTransition` / `startTransition` / `useDeferredValue` for non-urgent or expensive UI work.
- List keys: stable identity (`item.id`), not index when order can change.
- React 19: `ref` is a normal prop (no new `forwardRef`). `use()` only with a stable cached promise under `<Suspense>` - never `use(fetch(...))` created during render.
- Error boundaries at tree/lazy route edges; route errors via router's `errorComponent`. a11y partly linted (`jsx-a11y` on `apps/front-*/src/**`).
