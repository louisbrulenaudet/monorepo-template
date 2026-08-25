---
name: front-vitest
description: "Depth for Vitest tests of front-* React 19 SPAs when DOM, RTL, TanStack Query hooks, or TanStack Router route-tree tests are needed. USE WHEN: adding jsdom or testing-library, writing tsx render or renderHook tests, testing createMemoryHistory plus RouterProvider, Suspense UI, or React 19 act fixtures. DO NOT USE WHEN: Node-only services or queryOptions unit tests - follow the front-react path rule instead - or Workers pool tests."
metadata:
  source: project-owned
---

# Front-app Vitest depth

Hard constraints and Node-first defaults live in the path-scoped rule
`.claude/rules/tests/front-react.md` / `.cursor/rules/tests/front-react.mdc`.
Load this skill only when you need harnesses beyond that rule.

Pinned lock versions front-app 2026-08-11: react/react-dom 19.2.8,
@tanstack/react-query 5.101.4, @tanstack/react-router 1.170.25, vite 8.2.1,
vitest 4.1.10.

Docs retrieved 2026-08-11: vitest.dev environment/config, tanstack.com/query
testing, tanstack.com/router setup-testing and file-based testing, react.dev
act / StrictMode / forwardRef / use.

## Prerequisites

Not installed in this workspace today: jsdom, happy-dom, @testing-library/react,
@testing-library/jest-dom, @testing-library/user-event. Vitest does not bundle
jsdom/happy-dom. Add peers via catalog / pnpm add -D and extend Vitest config
before writing render / renderHook / .tsx suites. Do not invent a DOM suite
under Node.

## Environment and setup

Keep package default environment node for existing Node suites. Prefer per-file
control comment `@vitest-environment jsdom`.

Setup file: import `@testing-library/jest-dom/vitest` and set
`globalThis.IS_REACT_ACT_ENVIRONMENT = true`. React act requires that flag; RTL
sets it when used. See https://react.dev/reference/react/act .

### Vitest config for JSX

A separate vitest.config.ts ignores vite.config.ts unless you mergeConfig
https://vitest.dev/config/ . JSX/tsx tests need at least @vitejs/plugin-react
in the Vitest config.

Do not blindly mergeConfig the full apps/front-app/vite.config.ts - it loads
cloudflare, prod env asserts, Devtools. Add only needed plugins. Never
cloudflareTest on front-*. If adding the TanStack Router Vite plugin under
Vitest, place it before react. Use `#/*` imports - never invent `@/`. Prefer
vi.stubEnv over .env.production. Coverage is not configured for front-app -
do not invent thresholds.

## React 19 in tests

- Prefer await act with an async callback. Sync act is discouraged and will be
  deprecated. Prefer RTL render / userEvent, which wrap act.
- ref is a normal prop - do not add forwardRef in new fixtures.
- StrictMode double-invokes render/effects/ref callbacks in development only.
  Vitest does not mount StrictMode unless the test tree does.
- use with a promise needs a stable, cached promise under Suspense - never
  use fetch created during render.
- useActionState is the React 19 name formerly useFormState in canaries.

## TanStack Query hooks RTL

Fresh QueryClient per test, or clear between tests; avoid parallel share.
Defaults: retry false, gcTime Infinity. Query-level retry still wins.

Use renderHook from @testing-library/react - not @testing-library/react-hooks.
Wrap with QueryClientProvider. Await waitFor until isSuccess, then assert data.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: Infinity } },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const { result } = renderHook(() => useCustomHook(), { wrapper });
await waitFor(() => expect(result.current.isSuccess).toBe(true));
```

Suspense gap: Query testing guide does not prescribe a Vitest Suspense harness
retrieved 2026-08-11. Prefer fetchQuery / ensureQueryData on queryOptions unless
Suspense UI is the subject. If testing useSuspenseQuery, wrap with Suspense plus
an error boundary. Do not combine suspense hooks with enabled or placeholderData.

## TanStack Router file-based

Import committed routeTree from `#/routeTree.gen`. Never hand-edit; regenerate
via `pnpm --filter=front-app run routes:generate`.

Canonical pattern matches Router package tests and apps/front-app/src/main.tsx:
QueryClientProvider outside RouterProvider with no children. Always pass
context.queryClient when loaders call ensureQueryData.

```ts
import { routeTree } from "#/routeTree.gen";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";

const history = createMemoryHistory({
  initialEntries: ["/"],
});

const router = createRouter({
  routeTree,
  history,
  context: { queryClient },
});
```

Then render QueryClientProvider wrapping RouterProvider alone. Await
screen.findByText, then waitFor until router.state.status is idle. Call RTL
cleanup in afterEach. Navigate with await act around router.navigate.

Search validation: drive via initialEntries query strings
https://tanstack.com/router/latest/docs/framework/react/how-to/validate-search-params

Isolated logic may use a manual mini tree createRootRoute / createRoute without
the generated tree - that does not replace codegen for app routes.

Doc caveat: some TanStack how-tos wrap RouterProvider with children and a dummy
ui. This app mounts provider-only. Prefer provider-only for full route-tree tests.

## Extra gotchas DOM / harness

| Symptom | Fix |
|---------|-----|
| window is not defined | Install jsdom; @vitest-environment jsdom |
| act environment warning | Setup IS_REACT_ACT_ENVIRONMENT or use RTL |
| JSX fails under Vitest | Add @vitejs/plugin-react to Vitest config; do not merge full app Vite config |
| Suspended UI missing | Suspense + error boundary, or test via fetchQuery |
| Flaky sync act | await act with async callback, or RTL |
| Loader stale after search | Fix loaderDeps in route; put search in initialEntries |
