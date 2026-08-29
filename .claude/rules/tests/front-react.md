---
paths:
  - "apps/front-*/tests/**"
  - "apps/front-*/vitest.config.ts"
  - "apps/front-*/vitest.setup.ts"
---

# Front-app Vitest

General: [vitest.md](vitest.md). Discipline: [testing.md](../quality/testing.md). DOM/RTL harness depth: skill **`front-vitest`**. Never use the Workers pool on `front-*`.

## Repo invariants

- Config: `defineNodeConfig` + `resolvePackageRoot(import.meta.dirname)` for `root` / `test.dir` from `@repo/vitest-config` (Node). Never `cloudflareTest`.
- Prefer Node unit tests for `services/`, `utils/`, `*-query-options`: isolated `QueryClient` with `retry: false` and `gcTime: Infinity`; exercise shared `queryOptions` via `fetchQuery` / `ensureQueryData`. Do not reuse `src/config/query-client.ts` across tests without `clear`.
- Never hand-edit `src/routeTree.gen.ts` - regenerate with app `routes:generate` / `routes:check`.
- Imports from `vitest` only; in-app paths via `#/*`. Typecheck via `tests/tsconfig.json` (in package `check-types`).
- Agents: `pnpm turbo run test --filter=front-app` (non-watch).
- DOM harness installed: happy-dom + `@testing-library/react` / `jest-dom` / `user-event` (catalog deps). Config-wide environment stays `node`; a DOM suite opts in per file with `// @vitest-environment happy-dom` on line 1. `vitest.setup.ts` registers the jest-dom matchers, the React 19 act flag, and `afterEach(cleanup)` (globals are off, so RTL auto-cleanup never registers). `.tsx` test files are matched. Canonical example: `tests/components/ui/button.test.tsx`. Depth: skill `front-vitest`.
- happy-dom is the deliberate default (speed on constrained hardware). If a suite hits a happy-dom spec gap, switch that one file to `@vitest-environment jsdom` after adding the dep - do not change the config-wide environment.
