# Front App Agent Instructions

## Overview

`front-app` is the **React SPA**: Vite + React 19 + Tailwind CSS v4 + TanStack Router/Query, deployed as an assets-only Worker on Cloudflare (root `AGENTS.md`, Decision Checklist #4). Talks to **`worker-api` over HTTP only** - no service bindings.

- **Dev**: `http://localhost:5174`, loopback only - the Vite DevTools terminals are a shell, so never commit `server.host`; for a one-off LAN session run `pnpm --filter=front-app exec vite --host`, since `cf dev` forwards only `--mode` and rejects any other argument
- **API**: `worker-api` at `http://localhost:8700` via `src/config/env.ts` - never hardcode the origin elsewhere

Path-scoped rules under `src/`: `frontend/react` (all of `src/**`: layout, components, providers, env, React Doctor), `frontend/tailwind` (`.tsx` / `.css` / `.ts`), `frontend/tanstack-query` (services, hooks, query options), `frontend/tanstack-router` (routes, pages); wire schemas: `contracts/contracts`.

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
├── cloudflare.config.ts # Assets-only Worker per mode, SPA not-found handling
├── vite.config.ts       # Cloudflare plugin (type generation off), ports, build, _headers + .assetsignore
├── tsconfig.node.json   # vite, vitest, and cloudflare configs; in check-types
└── .cloudflare/         # Generated, gitignored: output/ (cf build), state/ (cf dev)
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
| SPA / deploy config | `cloudflare.config.ts` (Worker name, `ENVIRONMENT`, assets, observability per mode), `vite.config.ts` (ports, build, `_headers` CSP). No `types` script: nothing here reads `Env` |
| API request id, fetch timeout | `fetch-api.ts` reads the gateway's `X-Request-Id` response header into `FetchApiError.requestId`; the SPA never sends one. Keep `DEFAULT_TIMEOUT_MS` above the gateway's timeout, or the SPA aborts before the `504` and its request id arrive (rule `backend/hono-gateway`) |
| Unit tests | `tests/` mirroring `src/` + `vitest.config.ts` (`@repo/vitest-config`) |

## Adding a Feature

1. Schemas in `packages/dtos-common/src/api/<feature>.ts`.
2. Route in `apps/worker-api/src/routes/<feature>.ts`.
3. Service `src/services/worker-api/<feature>.ts` with `fetchJsonWithSchema` (`src/utils/fetch-api.ts`).
4. Query options in `<feature>-query-options.ts` if using TanStack Query.
5. Hook `src/hooks/use-<feature>.ts`.
6. Page + eager/lazy routes under `src/pages/` and `src/routes/`.
7. `pnpm run ci`.

Local env: `cp .env.example .env` (and `.env.production.example` to `.env.production` for prod builds). Every `.env*` file here holds public `VITE_*` values only (root `AGENTS.md`, Environment).

## Commands

| Command | Description |
|---------|-------------|
| `pnpm -w turbo run dev --filter=front-app` | `cf dev` (Vite) on port 5174 plus the gateway |
| `pnpm -w turbo watch dev --filter=front-app` | Same as `dev`, but restarts when watched dependency inputs change (optional; JIT + Vite HMR usually enough) |
| `pnpm -w turbo run test --filter=front-app` | Vitest Node, vitest run |
| `pnpm -w turbo run <upload\|deploy> --filter=front-app --force` | `cf workers versions create --prebuilt --mode production` (no traffic) / `cf deploy --prebuilt --mode production` (upload + 100%), each after `build` and `check-types`; `--force` skips cache reads, so it never ships a Build Output restored from the remote cache that PR runs can write. Promote or roll back with `cf workers deployments create` (root `README.md`, Releases and deploys) |
| `pnpm -w turbo run check-types --filter=front-app` | Route generation + typecheck |
| `pnpm -w react-doctor:changed` | React Doctor offline changed-scope scan - run after React edits (deep workflow: skill `react-doctor`) |
| `pnpm analyze` | Bundle stats (`dist/stats.html`) |
