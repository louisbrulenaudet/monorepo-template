# Worker API Agent Instructions

## Overview

`worker-api` is the **public HTTP gateway**: **Cloudflare Workers** + **Hono**, built with the Cloudflare Vite plugin and configured in `cloudflare.config.ts`, port **8700** in dev. Entry point for `front-app` over HTTP; coordinates internal Workers via service bindings when those bindings exist.

Starter surface: `GET /api/v1/health` returns `{ status, version }` (semver from `package.json`, inlined at build; `front-app` renders it in its footer), and `POST /api/v1/echo` is the `validator()` reference implementation (json + query targets), gated off in production because it reflects caller input without auth or rate limiting. `X-Worker-Version-Id` stays the opaque Worker version id (`CF_VERSION_METADATA`).

Rules that load with this app: `backend/hono-gateway` (middleware order, CORS/CSRF, errors, validation), `backend/service-bindings`, `backend/workers-config` and `backend/workers-cache` (with `cloudflare.config.ts`).

## Structure

```
apps/worker-api/
├── src/
│   ├── middlewares/          # cors, csrf (env-dependent Hono wrappers, gateway-only)
│   ├── app-env.ts            # AppEnv = HonoEnv<Env> (bindings contract for @repo/hono-middleware)
│   ├── routes/<feature>.ts   # One route module per feature
│   └── index.ts              # Middleware registration (shared exports + local) + route mounts
├── tests/                    # Vitest suites - Cloudflare pool / workerd
│   └── tsconfig.json         # @cloudflare/vitest-plugin/types; in check-types
├── cloudflare.config.ts      # Worker config per mode: DEPLOYMENTS, TEST, PREVIEW
├── vite.config.ts            # Cloudflare Vite plugin: port, inspector, minify, source maps
├── vitest.config.mts         # defineWorkersConfig from @repo/vitest-config/workers (reads mode test)
├── tsconfig.json             # src + cloudflare.config.ts + .cloudflare/types
├── tsconfig.node.json        # vite.config.ts; in check-types
└── .cloudflare/              # Generated, gitignored: types/ (pnpm types), output/ (cf build), state/ (cf dev)
```

## Where to Change Things

| Task | Location |
|------|---------|
| New endpoint | `src/routes/<feature>.ts` then mount in `src/index.ts` |
| Middleware | `src/middlewares/<name>.ts` then register in `src/index.ts` before route mounts; `packages/hono-middleware` once a second Hono app needs it |
| Shared schema | `packages/dtos-common/src/api/<feature>.ts` |
| Worker-local value set | `src/enums/` - create the directory on first use |
| Handler logic past thin orchestration (I/O, binding calls, non-trivial mapping) | `src/services/<feature>.ts` - create on first use |
| Binding, text value, observability, Worker name per mode | `cloudflare.config.ts` (`DEPLOYMENTS`, `TEST`, `PREVIEW`), then `pnpm -w types` |
| Dev port, inspector, minify, source maps | `vite.config.ts` |
| Secrets | `bindings.secret()` in `cloudflare.config.ts`, with a `bindings.text()` fake in `TEST` (and `PREVIEW` when Previews run without it). Local values come from a gitignored `.env` here or the shell (`SENTRY_DSN=<dsn>`), never a `.dev.vars` (root `AGENTS.md`, Environment) |
| Unit tests Vitest pool | `tests/` + `vitest.config.mts` `@repo/vitest-config/workers` |

## Adding an Endpoint

1. Contract in `packages/dtos-common/src/api/<feature>.ts`.
2. Route `src/routes/<feature>.ts`, with `validator()` on every input. An input-less GET with a constant body (e.g. health) asserts the shared schema in Vitest instead of re-parsing on every request.
3. Mount in `src/index.ts`.
4. A new secret: `bindings.secret()` in `cloudflare.config.ts` with a `bindings.text()` fake in `TEST`, then `pnpm -w types`.
5. Add the endpoint to the list in `README.md`.
6. `pnpm run ci`.

## Security

Before shipping auth or other abuse-prone public writes, add a Workers [Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) binding and/or zone WAF rules; health-only traffic does not need it yet.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm -w turbo run dev --filter=worker-api` | `cf dev`: Vite on :8700, ready when it prints `Local: http://localhost:8700/`. `SENTRY_DSN=<dsn>` in front turns Sentry on; without it the plugin warns `Missing required secrets for Worker "worker-api": SENTRY_DSN`, which is expected, and Sentry stays off |
| `pnpm -w turbo run build --filter=worker-api` | `cf build` (mode `production`) into `.cloudflare/output/v0/` |
| `pnpm -w types` | `cf workers types`: regenerate `.cloudflare/types/index.d.ts` after editing `cloudflare.config.ts` |
| `pnpm --filter=worker-api exec cf workers check --prebuilt --mode production` | After a build, and after dependency or DTO changes: bundle size and startup timings as JSON, CPU profile in `worker-startup.cpuprofile` (gitignored) |
| `pnpm --filter=worker-api exec hono agent-context` | **Run first when working on this app.** Hono CLI (`@hono/cli`, a devDependency) reference generated from the installed version, so it cannot drift; every command prints JSON, `--plain` is for humans |
| `pnpm --filter=worker-api run routes` | `hono routes`: every registered route as JSON, without booting a server; run it after changing middleware order or a mount, `--verbose` for middleware |
| `curl -s http://localhost:8700/api/v1/health` | Call a route on the running dev server (smoke probes and local traces: skill `run-app`). Not `hono request`: it loads bindings through Wrangler's `getPlatformProxy`, and `--runtime workerd` needs a Wrangler config, so both run without this app's bindings - and every `/api/*` route reads `c.env`. This is the fast loop between edits, not a replacement for the pool suites |
| `pnpm -w turbo run test --filter=worker-api` | Vitest Workers pool, vitest run |
| `pnpm -w turbo run <upload\|deploy> --filter=worker-api --force` | `cf workers versions create --prebuilt --mode production` (no traffic) / `cf deploy --prebuilt --mode production` (upload + 100%), each after `build` and `check-types`; `--force` skips cache reads, so it never ships a Build Output restored from the remote cache that PR runs can write. Promote or roll back with `cf workers deployments create` (root `README.md`, Releases and deploys) |
| `pnpm exec wrangler tail worker-api-production` | Live production logs; Wrangler-only, and it cannot target Previews |

Scope `exec` / `run` with `pnpm --filter=worker-api`, never with `-w` as well (root `AGENTS.md`, Scoping): the command would also run at the repo root, which has no `hono` and no `cloudflare.config.ts`.
