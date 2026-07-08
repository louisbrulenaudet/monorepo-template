# Monorepo Agent Instructions

## Project Overview

A minimal, production-oriented monorepo starter built on **pnpm workspaces** with **Turborepo**, **Cloudflare Workers**, **Hono**, and a **React (Vite) frontend** styled with **Tailwind CSS v4**. `front-app` talks to `worker-api` over **HTTP**; service bindings are the preferred pattern for Worker-to-Worker communication when you add more Workers.

## Quick Start

```bash
make install    # dependencies + workspace links
make login      # Cloudflare (remote Worker features)
make prepare    # Husky pre-commit hooks
make dev        # all dev servers
```

Verify: `GET http://localhost:8725/api/v1/health` and `http://localhost:5174`.

After scaffolding a new worker under `apps/`, run `make install` before turbo commands.

## Architecture

```mermaid
flowchart TD
  subgraph frontend [Frontend]
    FrontApp["front-app (React + Vite)"]
  end
  subgraph backend [Backend Workers]
    WorkerApi["worker-api (Hono gateway)"]
    OrmWorker["orm-* (Drizzle ORM only)"]
    BizWorker["worker-* (business logic)"]
    WebhookWorker["webhook-* (event processing)"]
  end
  subgraph shared [Shared Packages]
    DTOs["@repo/dtos-common"]
    Enums["@repo/enums-common"]
    TSConfig["@repo/typescript-config"]
  end
  FrontApp -->|"HTTP REST"| WorkerApi
  WorkerApi -->|"service binding"| OrmWorker
  WorkerApi -->|"service binding"| BizWorker
  DTOs --> WorkerApi
  DTOs --> FrontApp
  Enums --> DTOs
```

| Package | Purpose |
|---------|---------|
| `@repo/dtos-common` | Shared Zod schemas — `src/api/*` (HTTP), `src/rpc/*`, `src/queue/*`, `src/webhook/*` |
| `@repo/enums-common` | Shared enumerations across apps/packages |
| `@repo/typescript-config` | TypeScript presets for Workers and Vite React |

## Worker Prefixes

| Prefix | Example | Role |
|--------|---------|------|
| `orm-` | `orm-account` | Drizzle schema + migrations only |
| `worker-` | `worker-crawling` | Business logic; calls ORM via bindings |
| `webhook-` | `webhook-clerk` | External webhook processing |
| `front-` | `front-app` | React SPA; HTTP to backend only |

## Where to Put Things

| Task | Location |
|------|---------|
| New API endpoint route | `apps/worker-api/src/routes/<feature>.ts` → mount in `src/index.ts` |
| Request/response Zod schemas (HTTP) | `packages/dtos-common/src/api/<feature>.ts` |
| Service-binding RPC schemas | `packages/dtos-common/src/rpc/<feature>.ts` |
| Queue message schemas | `packages/dtos-common/src/queue/<feature>.ts` |
| Webhook payload schemas | `packages/dtos-common/src/webhook/<feature>.ts` |
| Shared enum values | `packages/enums-common/src/index.ts` |
| Worker-local enum | `apps/<worker>/src/enums/` |
| Frontend API service | `apps/front-app/src/services/worker-api/<feature>.ts` |
| Frontend page | `apps/front-app/src/pages/` + `src/routes/` (TanStack file routes) |
| Reusable UI / hooks | `apps/front-app/src/components/ui/`, `src/hooks/` |
| Worker bindings / config | `apps/<worker>/wrangler.jsonc` |
| Local dev secrets | `apps/<worker>/.dev.vars` (from `.dev.vars.example`) |

Queue-consuming workers use a dual-handler layout: `handlers/request.ts`, `handlers/message.ts`, shared `services/`, minimal `index.ts`.

## Port Allocation

| Service | Dev port | Config |
|---------|----------|--------|
| `worker-api` | **8725** | `apps/worker-api/wrangler.jsonc` |
| `front-app` | **5174** | Vite / `package.json` |

Reserved ranges: ORM 8700–8710, app workers 8720–8729, webhooks 8760–8769, frontends 5170–5179.

## Environment

Copy `.dev.vars.example` → `.dev.vars` per app before local runs. Never commit `.dev.vars` or real secrets — update `.dev.vars.example` when adding keys.

## Service Bindings

Worker-to-Worker calls use bindings in `wrangler.jsonc` (`services` array) and `env.BINDING` — zero latency, no public URL. **Do not** use bindings from `front-app`.

## Contract Change Workflow

1. Edit schemas in `packages/dtos-common/src/<layer>/` (`api`, `rpc`, `queue`, or `webhook`).
2. Update `worker-api` route validation.
3. Update `front-app` parsing / forms.
4. Run `make check-types`.

Prefer **additive** changes. For breaking changes, version the route (e.g. `/api/v2/`) and migrate deliberately.

## Code Quality

Lint and format: `.oxlintrc.json` and `.oxfmtrc.json` at repo root (`make ci`). Naming, contracts, React, and Workers patterns load from **path-scoped** `.claude/rules/` when editing matching files. Unconditional guardrails: `.claude/rules/guardrails.md`.

TypeScript presets: see [packages/typescript-config/AGENTS.md](packages/typescript-config/AGENTS.md) — apps **extend** a preset; do not fork compiler options.

## Make Commands (root)

| Command | Description |
|---------|-------------|
| `make install` | Install and link workspace packages |
| `make dev` | Start all dev servers |
| `make ci` | Lint + format + check-types (run before PRs) |
| `make check-types` | TypeScript across all packages |
| `make types` | Generate `worker-configuration.d.ts` in apps |
| `make build` / `make deploy` | Build or deploy via Turborepo |
| `make format` / `make lint` | Fix formatting / lint issues |

Per-app commands: see each app's `AGENTS.md` or `Makefile`.

## Memory Layout (Claude Code + Cursor)

| Layer | Claude Code | Cursor |
|-------|-------------|--------|
| Global instructions | [CLAUDE.md](CLAUDE.md) (imports this file) | [AGENTS.md](AGENTS.md) (workspace rules) |
| Path-scoped rules | [`.claude/rules/`](.claude/rules/) (`*.md`) | [`.cursor/rules/`](.cursor/rules/) (`*.mdc`) |
| Hooks | [`.claude/settings.json`](.claude/settings.json) | [`.cursor/hooks.json`](.cursor/hooks.json) |
| Hook scripts (shared) | [`hooks/`](hooks/) | [`hooks/`](hooks/) |
| Subagents | [`.claude/agents/`](.claude/agents/) | [`.cursor/agents/`](.cursor/agents/) |
| Slash commands | — | [`.cursor/commands/`](.cursor/commands/) |
| Deep skills | [`.agents/skills/`](.agents/skills/) | same (shared) |
| Nested app guides | `CLAUDE.md` per app/package | `AGENTS.md` per app/package |

- Claude Code: nested `CLAUDE.md` in apps/packages load on demand; debug instruction loading with `tail -f hooks/logs/instructions-loaded.log`.
- Cursor: path-scoped rules attach by glob; debug hook activity in **Customize → Hooks** output channel; session logs in `hooks/logs/session-start.log`.
- **Keeping Claude + Cursor in sync:** when you edit a path-scoped rule or subagent, update the parallel file in the other folder (`.claude/rules/*.md` ↔ `.cursor/rules/*.mdc`, `.claude/agents/*.md` ↔ `.cursor/agents/*.md`). Hook scripts are canonical in [`hooks/`](hooks/); both tools reference that directory via their config files.

See [`.cursor/README.md`](.cursor/README.md) for a quick index of the Cursor setup.

## Agent Guides

| Focus | Guide | Claude entry |
|-------|-------|--------------|
| React SPA | [apps/front-app/AGENTS.md](apps/front-app/AGENTS.md) | [apps/front-app/CLAUDE.md](apps/front-app/CLAUDE.md) |
| HTTP gateway | [apps/worker-api/AGENTS.md](apps/worker-api/AGENTS.md) | [apps/worker-api/CLAUDE.md](apps/worker-api/CLAUDE.md) |
| Zod DTOs | [packages/dtos-common/AGENTS.md](packages/dtos-common/AGENTS.md) | [packages/dtos-common/CLAUDE.md](packages/dtos-common/CLAUDE.md) |
| Shared enums | [packages/enums-common/AGENTS.md](packages/enums-common/AGENTS.md) | [packages/enums-common/CLAUDE.md](packages/enums-common/CLAUDE.md) |
| TS presets | [packages/typescript-config/AGENTS.md](packages/typescript-config/AGENTS.md) | [packages/typescript-config/CLAUDE.md](packages/typescript-config/CLAUDE.md) |
| Agent hooks | [hooks/AGENTS.md](hooks/AGENTS.md) | [hooks/CLAUDE.md](hooks/CLAUDE.md) |

Extend this table when adding a new app or package with its own guide.

## Decision Checklist

1. Schema already in `@repo/dtos-common`? Import it — don't redefine.
2. Enum already in `@repo/enums-common`? Import it — don't duplicate literals.
3. Worker-to-Worker call? Service binding, not HTTP.
4. Filename follows kebab-case? (PascalCase only for React `.tsx` components in `front-app`.)
5. Worker function under 100 lines? Extract helpers if not.
6. All imports used? oxlint errors on unused vars.

## Contribution

- Run `make ci` before opening a PR.
- Update the relevant `AGENTS.md` when adding endpoints, bindings, env vars, or conventions.
- HTTP contracts live in `@repo/dtos-common`; update `worker-api` and `front-app` together.
- Never commit secrets or real environment values.
