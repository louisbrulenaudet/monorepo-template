---
paths:
  - "apps/front-*/src/**/*.{ts,tsx}"
---

# React (19) Component & Hook Rules

These apps are **client-only Vite SPAs** — no SSR, no React Server Components, no `"use server"`. Anything framed around those in general React guidance does not apply here. For deep guidance load the **`vercel-react-best-practices`** skill.

Split of concerns (don't duplicate across files):

- **Server/async state & data fetching** → [tanstack-query.md](tanstack-query.md). **Never** fetch in `useEffect`.
- **Routing, route data, URL/search state** → [tanstack-router.md](tanstack-router.md).
- **Vite config, providers, code-splitting mechanics, env** → [frontend-architecture.md](frontend-architecture.md).
- Naming/filenames → [naming.md](naming.md); lint/format → [code-style.md](code-style.md) (`max-lines-per-function` is off in `apps/front-*`, but keep components small anyway).

## Composition & purity

- **Never define a component (or a `memo`/`lazy` wrapper) inside another component's body.** It is a new type each render → the child remounts and loses state/DOM/focus. Hoist it to module scope and pass props.
- Keep components small and pure; read parent data via props, not by nesting to close over variables.
- Hoist static JSX and large static SVGs to module scope so they aren't recreated per render.
- Function components + hooks only. Follow the Rules of Hooks: no conditional or looped hook calls. The one exception is `use()`, which may be called conditionally.

## You might not need an Effect

- **Derive during render** instead of storing-and-syncing with `useEffect`. Setting state in an effect just to mirror props/other state causes a wasted render and drift.
- Put side effects of a user action (submit, click) **in the event handler**, not in a state flag + effect.
- Use effects only to **synchronize with something external** (subscriptions, DOM/event listeners, third-party widgets, timers). Narrow deps to primitives (`[user.id]`, not `[user]`); clean up on unmount.
- App-wide "run once" init belongs at the entry module (or behind a module-level guard), never in a component's `useEffect([])` — that re-runs on remount and twice under StrictMode in dev.

## State

- Keep state minimal — no redundant/derived state. Colocate it; lift only as high as a shared owner requires.
- Pass an **initializer function** to `useState(() => expensiveInit())` for costly initial values (runs once); skip the function form for cheap literals.
- Use **functional updates** (`setX(cur => …)`) when the next value depends on the previous — avoids stale closures and keeps callbacks stable without a state dep.
- Subscribe to derived booleans, not continuous values (e.g. a `matchMedia` boolean, not raw window width). Don't subscribe to state you only read inside a callback — read it on demand there.

## Memoization & the React Compiler

- **If the React Compiler is enabled** (recommended for new apps — see [frontend-architecture.md](frontend-architecture.md)): do **not** hand-write `useMemo`/`useCallback`/`memo` by default; the compiler memoizes for you. Reach for them only as a precise escape hatch (e.g. stabilizing an effect dependency).
- **If the compiler is off**: memoize only genuinely expensive computation, and wrap non-primitive props/callbacks passed to `memo()` children. Don't wrap cheap primitive expressions in `useMemo` (the dep check costs more).
- For a `memo()` component with a non-primitive default prop, hoist the default to a module constant (`const NOOP = () => {}`) — an inline default defeats the memo every render.

## Concurrency & responsiveness

- Use `useTransition` / `startTransition` for non-urgent updates instead of a manual `isLoading` flag — you get a correct `isPending`, interruption, and error handling. React 19 allows async functions in transitions.
- Use `useDeferredValue` for expensive derived renders from fast-changing input (filtering large lists), and memoize the expensive work on the **deferred** value.

## Rendering correctness, lists, refs

- Give list items **stable, identity-based keys** (`item.id`). Never use the array index when items can reorder/insert/delete.
- Use a ternary (`cond ? <X/> : null`), not `cond && <X/>`, when the condition can be `0`/`NaN` — `&&` would render the falsy value.
- Use `useRef` for transient, non-render values (timers, flags, latest-value refs) and direct DOM reads; mutating a ref does not re-render.

## React 19 APIs

- **`ref` is a normal prop** — do not add `forwardRef` to new components; accept `ref` directly.
- **`use()`** reads a Promise or Context and may be conditional, but only with a **stable, cached** promise (from the data library / router loader) wrapped in `<Suspense>` — never `use(fetch(...))` created during render.
- `useActionState`, `useOptimistic`, `useFormStatus` are client hooks and are fine in a SPA for form pending/optimistic UI (ignore their server-action framing in the docs).

## Error handling & accessibility

- Wrap the tree (and lazy route boundaries) in an **error boundary** (a class boundary or `react-error-boundary`); there is no hook form. Route-level errors are better handled by the router's `errorComponent` (see [tanstack-router.md](tanstack-router.md)).
- Accessibility is partly linted (oxlint runs the `jsx-a11y` plugin on `apps/front-*/src/**`): use semantic elements (`<button>`, `<nav>`, headings), label every control (`<label htmlFor>` / `aria-label`), and manage focus on route change and dialog open/close.

## Before finishing

Run `make ci` from the repo root. Keep every Oxc rule green (see [code-style.md](code-style.md)); do not reach for `any` or a disable directive to clear a warning (see [guardrails.md](guardrails.md)).
