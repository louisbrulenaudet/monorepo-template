# Front App Agent Instructions

## Overview

`front-app` is the **React SPA**: Vite + React 19 + Tailwind CSS v4 + TanStack Router/Query, deployed as static assets on Cloudflare Workers. Talks to **`worker-api` over HTTP only** - no service bindings.

- **Dev**: `http://localhost:5174`
- **API**: `worker-api` at `http://localhost:8700` via `src/config/env.ts` - never hardcode the origin elsewhere

React, routing, query, and env patterns load from `.claude/rules/frontend/` or `.cursor/rules/frontend/` when editing `src/**`. Use **`ui-ux-design-best-practices`** for Tailwind motion depth. Wire schemas: `@repo/dtos-common` + `contracts` rules.

## Structure (abbreviated)

```
apps/front-app/src/
├── routes/          # TanStack file routes (loaders, guards - thin)
├── pages/           # Page UI (imported by *.lazy.tsx)
├── services/worker-api/   # <feature>.ts + <feature>-query-options.ts
├── hooks/           # use-<feature>.ts
├── components/ui/   # Reusable primitives
├── config/          # env.ts, query-client.ts
├── utils/           # fetch-api.ts
└── enums/           # Frontend-only value sets (`as const`)
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
| Frontend-only value set | `src/enums/<feature>.ts` |
| Shared value set | `packages/enums-common/src/index.ts` |
| SPA / deploy config | `wrangler.jsonc`, `vite.config.ts` |

## Adding a Feature

1. Schemas in `packages/dtos-common/src/api/<feature>.ts`.
2. Route in `apps/worker-api/src/routes/<feature>.ts`.
3. Service `src/services/worker-api/<feature>.ts` with `fetchJsonWithSchema` (`src/utils/fetch-api.ts`).
4. Query options in `<feature>-query-options.ts` if using TanStack Query.
5. Hook `src/hooks/use-<feature>.ts`.
6. Page + eager/lazy routes under `src/pages/` and `src/routes/`.
7. `make ci`.

Local env: `cp .env.example .env.local` (and `.env.production.example` for prod builds). `VITE_*` details: `frontend-architecture` rule.

## Commands

| Command | Description |
|---------|-------------|
| `make dev` | Vite on port 5174 (or `make dev` from repo root for front + API) |
| `make build` / `make preview` / `make deploy` | Build, preview, deploy |
| `make ci` | Lint + format + check-types |
| `pnpm analyze` | Bundle stats (`dist/stats.html`) |

## Contribution

Follow this file and root [AGENTS.md](../../AGENTS.md). Update HTTP contracts in `@repo/dtos-common` with `worker-api` in the same PR. Run `make ci` before merging.
