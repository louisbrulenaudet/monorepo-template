# Front App Agent Instructions

## Overview

`front-app` is the **React SPA**: Vite + React 19 + Tailwind CSS v4 + TanStack Router/Query, deployed as static assets on Cloudflare Workers. Talks to **`worker-api` over HTTP only** - no service bindings.

Keep `@cloudflare/vite-plugin` for assets + SPA routing only. Do **not** use Vite `auxiliaryWorkers` to co-locate `worker-api`, and do not put API routes in this assets Worker (Cloudflare SPA+API-in-one-Worker tutorial is an anti-pattern here). `worker-api` stays on Wrangler.

- **Dev**: `http://localhost:5174`, loopback only - the Vite DevTools terminals are a shell, so never commit `server.host`; pass `--host` for a one-off LAN session
- **API**: `worker-api` at `http://localhost:8700` via `src/config/env.ts` - never hardcode the origin elsewhere

React, routing, query, and env patterns: `frontend/*` rules (load with `src/**`). Tailwind motion depth: skill `ui-ux-design-best-practices`. Wire schemas: `@repo/dtos-common` + `contracts` rules.

## Structure (abbreviated)

```
apps/front-app/
├── src/
│   ├── routes/          # TanStack file routes (loaders, guards - thin)
│   ├── pages/           # Page UI (imported by *.lazy.tsx)
│   ├── services/worker-api/   # <feature>.ts + <feature>-query-options.ts
│   ├── hooks/           # use-<feature>.ts
│   ├── components/ui/   # Reusable primitives
│   ├── config/          # env.ts, query-client.ts, instrument.ts, sentry.ts, sentry-tracing.ts
│   ├── utils/           # fetch-api, client-safe-error
│   └── enums/           # Frontend-only value sets (`as const`)
├── tests/               # Vitest suites mirroring src/ (Node; DOM suites opt in per file)
├── vitest.config.ts     # defineNodeConfig from @repo/vitest-config
├── vitest.setup.ts      # jest-dom matchers, React 19 act flag, RTL cleanup
├── tests/tsconfig.json  # Included in check-types
├── vite.config.ts
└── wrangler.jsonc
```

## Where to Change Things

| Task | Location |
|------|---------|
| New page | `src/pages/<Page>.tsx` + `src/routes/<path>.tsx` + `src/routes/<path>.lazy.tsx` |
| Typed API call | `src/services/worker-api/<feature>.ts` |
| Query options | `src/services/worker-api/<feature>-query-options.ts` |
| UI primitive | `src/components/ui/<Name>.tsx` |
| Data hook | `src/hooks/use-<feature>.ts` |
| API base URL | `src/config/env.ts` (`VITE_API_BASE_URL`) |
| Sentry | `src/config/sentry.ts`, initialized by `src/config/instrument.ts`, which must stay the first import of `main.tsx`, in its own import block. It reads `VITE_SENTRY_DSN` directly, not through `env.ts`, so an unset DSN folds the SDK out of the bundle. `VITE_APP_ENVIRONMENT` (`AppEnvironment`, matches worker-api) is read in `src/config/env.ts`. Router tracing loads lazily from `sentry-tracing.ts` (its own `sentry-vendor~` chunk). Query/mutation errors other than `FetchApiError` are reported through `createQueryClient` in `query-client.ts`. Builds only inject debug IDs; CD uploads the maps (`sentry:sourcemaps`). The error screen (`RouteErrorFallback`) shows the Sentry event id of the error it renders as `Error id`: `beforeSend` (`rememberSentryEventId`) keys each sent event's id by its error object, and the screen reads it with `useSyncExternalStore`, because React reports a caught error only after the fallback has rendered. Not `lastEventId()`: it is global, so it moves with every later error |
| Frontend-only value set | `src/enums/<feature>.ts` |
| Shared value set | `packages/enums-common/src/index.ts` |
| SPA / deploy config | `wrangler.jsonc`, `vite.config.ts` |
| API request id | `fetch-api.ts` reads the gateway's `X-Request-Id` response header into `FetchApiError.requestId`; the SPA never sends one |
| Unit tests | `tests/` mirroring `src/` + `vitest.config.ts` (`@repo/vitest-config`) |

## Adding a Feature

1. Schemas in `packages/dtos-common/src/api/<feature>.ts`.
2. Route in `apps/worker-api/src/routes/<feature>.ts`.
3. Service `src/services/worker-api/<feature>.ts` with `fetchJsonWithSchema` (`src/utils/fetch-api.ts`).
4. Query options in `<feature>-query-options.ts` if using TanStack Query.
5. Hook `src/hooks/use-<feature>.ts`.
6. Page + eager/lazy routes under `src/pages/` and `src/routes/`.
7. `pnpm run ci`.

Local env: `cp .env.example .env.local` (and `.env.production.example` for prod builds). `VITE_*` details: `frontend-architecture` rule.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm -w turbo run dev --filter=front-app` | Vite on port 5174 plus the gateway |
| `pnpm -w turbo watch dev --filter=front-app` | Same as `dev`, but restarts when watched dependency inputs change (optional; JIT + Vite HMR usually enough) |
| `pnpm -w turbo run test --filter=front-app` | Vitest Node, vitest run |
| `pnpm -w turbo run <upload\|promote\|deploy> --filter=front-app` | `wrangler versions upload` (no traffic) / interactive `versions deploy` / `wrangler deploy` (upload + 100%) |
| `pnpm -w turbo run check-types --filter=front-app` | Route generation + typecheck |
| `pnpm -w react-doctor:changed` | React Doctor offline changed-scope scan - run after React edits (deep workflow: skill `react-doctor`) |
| `pnpm analyze` | Bundle stats (`dist/stats.html`) |

In-app absolute imports use package.json `imports` (`#/*` → `./src/*`), e.g. `import { Button } from "#/components/ui/Button"`.

HTTP contract changes land in `@repo/dtos-common`, `worker-api`, and this app in the same PR.
