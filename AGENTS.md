# Monorepo Agent Instructions

## Project Overview

A minimal, production-oriented monorepo starter: **pnpm workspaces** + **Turborepo**, **Cloudflare Workers** + **Hono**, and a **React (Vite) SPA** styled with **Tailwind CSS v4**. `front-app` talks to `worker-api` over **HTTP**; Worker-to-Worker calls use **service-binding RPC**. Architecture diagram: [README.md](README.md).

## Quick Start

`pnpm install`, then `pnpm dev` (all dev servers). One-time machine setup (`cf` telemetry off, `pnpm run login`, `pnpm prepare` for the Vite+ pre-commit hooks): README "Getting started". `pnpm run login` is `cf auth login`; bare `pnpm login` is the npm-registry builtin.

A new worker under `apps/` needs `monorepo.deployOrder` (lower promotes first; gateways before the SPAs that call them) and `monorepo.healthPath` (public probe path, or `null` for no public HTTP surface) in its `package.json`, then `pnpm install` before turbo commands. Nothing else lists apps: the changeset group, the root `--filter='./apps/*'` scripts, and CD all discover them.

## Worker Prefixes

| Prefix | Example | Role | Production surface |
|--------|---------|------|--------------------|
| `worker-api` | `worker-api` | HTTP gateway (sticky name) | Public HTTP only |
| `worker-` | `worker-account` | Business logic | **RPC only** via service bindings |
| `queue-` | `queue-email` | Queue-only consumer | `queue()` handler; no public HTTP |
| `webhook-` | `webhook-example` | External webhook ingress | Public HTTP for provider callbacks |
| `mcp-` | `mcp-tools` | MCP server | Public HTTP MCP (SSE / streamable HTTP); tools call `worker-*` via RPC |
| `front-` | `front-app` | React SPA | Vite → gateway over HTTP only |

A Worker that is both RPC and a queue consumer keeps prefix **`worker-*`** with the dual-handler layout; **`queue-*`** is for queue-only consumers.

## Where to Put Things

App-local detail: `apps/*/AGENTS.md` and `packages/*/AGENTS.md`.

| Task | Location |
|------|---------|
| HTTP route | `apps/worker-api/src/routes/<feature>.ts` → mount in `src/index.ts` |
| Zod schemas | `packages/dtos-common/src/{api,rpc,queue,webhook}/` |
| Shared enums | `packages/enums-common`; worker-local under `apps/<worker>/src/enums/` |
| Request id (`X-Request-Id`) | `requestIdMiddleware` in `packages/hono-middleware`: minted per request by the gateway, never sent by the SPA |
| Hono middleware shared by public-HTTP Workers | `packages/hono-middleware` (one export per middleware; each app registers them in its own `index.ts`) |
| DB schema / migrations | `apps/<owner>/src/db/` (one owner; never `packages/db-*`) |
| Frontend feature | `apps/front-app/src/{pages,routes,services,hooks,components}/` |
| Agent rules | `.claude/rules/<cat>/<name>.md` **and** its `.cursor/rules/<cat>/<name>.mdc` twin, in the same change (rule `core/agent-instructions`) |
| Bindings / secrets | `env` in `apps/<worker>/cloudflare.config.ts`: `bindings.text()` for plain values, `bindings.secret()` for secrets with a `bindings.text()` fake in the `test` mode |
| Tests (unit) | `apps/<app>/tests/` + `@repo/vitest-config` (Node, `front-*`) or `@repo/vitest-config/workers` (Cloudflare pool, every Worker); every new test passes the authoring gate in rule `quality/testing` |
| Tests (multi-Worker integration) | Wrangler `createTestHarness()` from a Node suite - only once a second Worker + service binding exists, and never replacing the per-app pool suites; see [`packages/vitest-config/AGENTS.md`](packages/vitest-config/AGENTS.md) |

Queue-only / dual-handler workers: `handlers/request.ts`, `handlers/message.ts`, shared `services/`, minimal `index.ts`.

## Environment

Node 24 (≥ 24.11, the floor Vite+ `vp` requires) and the exact pnpm version pinned in root `package.json`. Worker apps keep no `.env` and no `.dev.vars`: `cf` and the Cloudflare Vite plugin abort on an env file they cannot read, and the agent sandbox denies reading `.env` files. A local secret value comes from the shell instead (`SENTRY_DSN=<dsn> pnpm dev`; Turbo passes `SENTRY_DSN` through to `worker-api#dev`), and unset leaves Sentry off in dev. Every `front-app` `.env*` file holds only public `VITE_*` values, and the sandbox may read all of them (`**/apps/front-app/.env*`); frontend dev overrides go in `.env`. Local ports: rule `backend/ports`.

A worktree is a fresh checkout: run `pnpm install --frozen-lockfile --prefer-offline` in it before any turbo command. Sparse-checkout and `.worktreeinclude` policy: rule `core/worktrees`.

## cf CLI

Cloudflare tooling is the `cf` CLI (beta) over each app's typed `cloudflare.config.ts`, run through the package scripts or `pnpm --filter=<app> exec cf …`, never a global install. The root `wrangler` devDependency stays only for `wrangler tail`, a single `wrangler secret put`, and `wrangler preview delete` / `preview secret put`. Find a command with `pnpm exec cf cli search "<task>"` - keep the query anonymous, the action and resource type only, never names, IDs, domains, or tokens - then read `<command> --help` (`cf schema <command words>` for the API request shape) and try it with `--dry-run` before running it. Results are JSON on stdout, messages and errors on stderr. In a non-interactive session a destructive command without `--force` prints `Aborted.` and exits 0, so a zero exit does not prove anything changed; `--force` can also be an API parameter, so read `--help` before passing it. Never run `cf dev`, `cf build`, `cf deploy`, or `cf init` in a directory without `cloudflare.config.ts`: autoconfiguration rewrites the project. Agents never run `cf auth login`. Modes, bindings, Build Output, and the Local Explorer: skill `cf`.

## Root Scripts (pnpm)

`pnpm run` lists every root script. Non-obvious ones:

| Command | Description |
|---------|-------------|
| `pnpm run check` | Fastest tier: `types`, then lint, format, both syncpack checks, and the hook suite as parallel `//#` root tasks |
| `pnpm run fix` | `types`, `deps:fix`, `deps:format`, `lint:fix`, then `format:fix` (format last) |
| `pnpm run ci` | Full local PR gate: `pnpm run types`, `pnpm run boundaries`, one `turbo run --continue=dependencies-successful` of every check, `pnpm run audit`. Reports all failures in one pass |
| `pnpm run ci:affected` | `ci` scoped with `--affected`, minus knip and audit - mid-task only, never a substitute for `ci` |
| `pnpm run ci:agent` | `ci` with `lint:agent` / `knip:agent`, `--output-logs=errors-only`, `--log-order=grouped` |
| `pnpm run ci:sandbox` | `ci:agent` minus `build`: `front-app` declares `.env*` as `build` inputs, and turbo aborts traversal on one the sandbox cannot read. They are all readable through the `**/apps/front-app/.env*` allow once the settings patch lands; until then only `.env` and `.env.production` are. Ask the user to run `pnpm run ci` for build coverage |
| `pnpm lint:agent` | Lint with `--format=agent`, no auto-fix |
| `pnpm react-doctor` / `:changed` | Offline React Doctor scan of `front-*`; `:changed` after React edits (rule `frontend/react`) |
| `pnpm types` | `cf workers types` per Worker: regenerates the gitignored `.cloudflare/types/index.d.ts` (global `Env`) from `cloudflare.config.ts`. Cached by Turbo, and `check-types` depends on it |
| `pnpm boundaries` | Package tags vs `turbo.json` |
| `pnpm hooks:test` | `sh -n` plus the regression table for `hooks/` |
| `pnpm spell:check` / `spell:words` | cspell over the repo, dotfiles included / unknown words only, one per line. Vocabulary: `.cspell/project-words.txt` (not in `check` or `ci`) |
| `pnpm knip` / `knip:production` / `knip:agent` | Unused files, exports, deps; `--production --strict`; one line per symbol |
| `pnpm deps:check` / `deps:fix` / `deps:format` | syncpack lint (`catalog:` for third-party, `workspace:*` for `@repo/**`) / autofix / field ordering |
| `pnpm preview:deploy` / `preview:delete` | Worker Preview of every app (branch-slug name). Outward-facing; denied to agents (rule `ops/previews`) |
| `pnpm changeset` / `pnpm release:status` | Add a changeset / read-only release state (exits 1 when changed packages lack one, so not in `ci`) |

**Dependencies:** add every third-party dependency to the catalog in `pnpm-workspace.yaml` and reference it as `"catalog:"` (one-offs install via `catalogMode: prefer` but fail `syncpack lint`); internal packages use `"workspace:*"`.

### Releases

Every app under `apps/` bumps together as one Changesets `fixed` group, so one `vX.Y.Z` tag is a valid release coordinate. Nothing is published to npm; a release is a git tag plus a Cloudflare Workers promote.

- **Every PR that changes a deployable app ships a changeset** (`pnpm changeset`; `--empty` for no-release changes). Docs/tests/tooling-only PRs do not need one.
- **Merging the `chore: release` PR is the release act; no `v*` tag is ever pushed by hand.** `gate` validates the merged commit on `main`, then the tag is cut and handed to CD.

Release state machine, recovery, and rollback: rule `ops/release`; contributor walkthrough: [`.changeset/README.md`](.changeset/README.md).

### Scoping

- Turbo filters (`--filter=<pkg>`, `--filter=...pkg...`, `--affected`) apply to `check-types`, `test`, `build`, `dev`, `deploy`, `upload`, `preview`, `types`. Prefer scoped turbo while iterating; `--affected` is for GitHub CI. Run package scripts from the root or with `pnpm -w` - a raw package script bypasses Turbo dependencies. Never combine `-w` with `--filter`: pnpm adds the root project to the selection and runs the command there too.
- **Lint, format, Knip, and syncpack are `//#` root tasks** - one whole-repo pass at repo-root CWD. Never `cd` into a package to lint; narrow with a path: `pnpm --filter=front-app run lint:check`. Why: rules `core/turborepo`, `quality/lint-config`.
- **Lint contract:** iterate with `pnpm lint:fix`, finish with `pnpm lint:agent` and read only that output (`file:line:col: severity plugin(rule): message help:`); never parse the TTY-dependent `lint:check` output. On a fresh clone, run `pnpm types` before a bare `pnpm lint:fix` / `pnpm lint:agent`: type-aware lint reads the gitignored `.cloudflare/types`, which `check`, `fix`, and the `ci*` scripts generate first. Suppressions: `oxlint-disable*` only (rule `quality/code-style`). Type checking stays with tsc via `turbo run check-types`.
- **Knip:** the default and `--production` passes both stay green; never blanket-`ignore`; per-override rationale in rule `quality/knip`.

### Verifying a change (agents)

| Goal | Command |
|------|---------|
| One workspace's tests | `pnpm turbo run test --filter=<ws>` (a cache hit replays the log; `--force` re-executes) |
| One test file | `pnpm --filter=<ws> exec vitest run tests/<path>.test.ts` |
| Fast static recheck | `pnpm run check` |
| After editing a `cloudflare.config.ts` | `pnpm types`, then `pnpm check-types` |
| Mid-task iteration | `pnpm run ci:affected` |
| Full gate - required before finishing or opening a PR | `pnpm run ci`, or `pnpm run ci:agent` for machine-readable output |
| Full gate inside a sandbox | `pnpm run ci:agent`; fall back to `pnpm run ci:sandbox` if traversal aborts, then hand `build` back to the user |
| Run, smoke, browser-check, local traces, Preview probe | skill `run-app` |

Run dev servers through the harness's background-task mechanism (never a bare `&`) and stop them when done.

## Agent tooling

Dual-tree layout, sync policy, hooks, skills, MCP: skill `monorepo-agent-setup`; hook scripts: [hooks/AGENTS.md](hooks/AGENTS.md). Every `apps/*`, `packages/*`, and `hooks/` directory has an `AGENTS.md` + `CLAUDE.md` pair - give new packages the same. `turbo query` and remote-cache provisioning: rule `core/turborepo`.

**Subagents** (read-only): `explorer`, `planner`, `verifier`, `bundle-analyzer`, `docs-researcher`, `reviewer` (launched by `/review`). They load this file and the always-on rules at start, and path-scoped rules when they Read a matching file. Use `explorer` / `planner` instead of the built-in `Explore` / `Plan`, which load neither `CLAUDE.md` nor `.claude/rules/`; if you use a built-in anyway, restate the binding constraints in the prompt. The human-only `/review` and `/review-stack` commands are described in [README.md](README.md).

- **Main thread**: iterative work, phases sharing context, a small targeted change, latency-sensitive work.
- **Plan mode**: an uncertain approach or a multi-file change; skip it when the diff fits one sentence.
- **Skill**: a reusable procedure in the current context (`/review`, `/git-commit`).
- **Subagent**: output you will never re-read, a tool restriction the main thread cannot express, or a reviewer who is not the author. Never for a trivial or strictly sequential step, or one sharing mutable state with the main thread.
- **`tools` is the only real least-privilege gate.** Parent `acceptEdits` overrides a subagent's `permissionMode`; omit `Edit`/`Write`/`Bash` for read-only agents.
- **Agents never write scratch files into the working tree.** Findings come back in the reply.

## Enforced Boundaries

`pnpm boundaries` (inside `pnpm run ci`) fails on tag violations; rules in root `turbo.json` `boundaries.tags`, rationale in rule `core/boundaries`.

- **Nothing may import an `app`**, its `cloudflare.config.ts` included. Worker-to-Worker: a service binding by Worker name in the caller's `cloudflare.config.ts` (`bindings.worker({ worker: "worker-foo-production" })`), never a package import.
- A new app/package needs `turbo.json` with `"extends": ["//"]` and a `tags` entry (`app`, `contracts`, `contracts-base`, `framework`, `lib`, or `config`).

## Decision Checklist

1. Worker-to-Worker call? **Service binding RPC**, not HTTP.
2. DB access? Schema + binding in **one** owning `worker-*` / `queue-*` under `src/db/` - never `packages/db-*`, never the same DB binding on multiple apps. Others use RPC or a queue.
3. Public HTTP only for gateway, webhooks, MCP, and frontends - not for business RPC or queue-only workers.
4. SPA to API? `front-*` and `worker-*` both build with the Cloudflare Vite plugin (`cf dev` / `cf build`), each its own Worker with its own `cloudflare.config.ts`; `front-*` is assets-only. Never co-locate the gateway as a Vite `auxiliaryWorkers` entry or put API routes in the assets Worker.
5. Testing a branch remotely? **Worker Previews** (the `ctx.isPreview` branch of `cloudflare.config.ts`, built under `--mode production`, + `pnpm preview:deploy`), never Version URLs or a new mode. A Preview's service bindings reach the **production** callee.

## Contribution

- HTTP contracts live in `@repo/dtos-common`; update `worker-api` and `front-app` together.
- CD ([`cd.yml`](.github/workflows/cd.yml), rule `ops/cd`) and branch Previews ([`preview.yml`](.github/workflows/preview.yml), rule `ops/previews`) are **paused** until the `CD_ENABLED` / `PREVIEWS_ENABLED` repository variables are `true`.
