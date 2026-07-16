# Worker API Agent Instructions

## Overview

`worker-api` is the **public HTTP gateway**: **Cloudflare Workers** + **Hono**, port **8700** in dev. Entry point for `front-app` (HTTP) and coordinator for internal Workers (service bindings).

Starter surface: `GET /api/v1/health`. Hono lifecycle, middleware order, and validation patterns load from `.claude/rules/backend/hono-gateway.md` or `.cursor/rules/backend/hono-gateway.mdc` when editing `src/**`.

## Structure

```
apps/worker-api/src/
├── routes/<feature>.ts   # One route module per feature
├── enums/              # Worker-local value sets (`as const`)
└── index.ts            # Middleware stack + route mounts
```

## Where to Change Things

| Task | Location |
|------|---------|
| New endpoint | `src/routes/<feature>.ts` → mount in `src/index.ts` |
| Middleware | `src/index.ts` (before route mounts) |
| Shared schema | `packages/dtos-common/src/api/<feature>.ts` |
| Worker-local value set | `src/enums/` |
| Service binding | `wrangler.jsonc` → `services` |
| Secrets | `.dev.vars` (dev); document in `.dev.vars.example` |

## Local Development

```bash
make dev                              # repo root
pnpm turbo dev --filter=worker-api   # this worker only
```

Verify: `GET http://localhost:8700/api/v1/health`

## Adding an Endpoint

1. Contract in `packages/dtos-common/src/api/<feature>.ts`.
2. Route `src/routes/<feature>.ts` with `zValidator` on every input.
3. Mount in `src/index.ts`.
4. Business logic in a service module or via `env.BINDING`.
5. Update `.dev.vars.example` for new secrets.
6. `make ci`.

## Service Bindings

Worker-to-Worker only (never from `front-app`). Configure in `wrangler.jsonc` → `services`; call via `env.BINDING.method()` in a route handler or service module. RPC typing (`WorkerEntrypoint`, multi `-c` `wrangler types`) → [`.cursor/rules/backend/workers-config.mdc`](../../.cursor/rules/backend/workers-config.mdc). Run `make types` after adding bindings.

Workers Cache: [`.cursor/rules/backend/workers-cache.mdc`](../../.cursor/rules/backend/workers-cache.mdc) / [`.claude/rules/backend/workers-cache.md`](../../.claude/rules/backend/workers-cache.md).

## Commands

| Command | Description |
|---------|-------------|
| `make dev` | Dev server on :8700 |
| `make types` | Regenerate `worker-configuration.d.ts` |
| `make deploy` | Deploy to Cloudflare |
| `make ci` | Lint + format + check-types |

## Contribution

Follow this file and root [AGENTS.md](../../AGENTS.md). Update `README.md` when adding endpoints, middleware, or bindings. Contract changes need `dtos-common` + `front-app` in the same PR. Run `make ci` before merging.
