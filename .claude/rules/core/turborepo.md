---
paths:
  - "**/turbo.json"
---

# Turborepo

Root `turbo.json` task `description`s say what each task does; the why is here. Tags: [boundaries.md](boundaries.md); CI invariants: [../ops/ci.md](../ops/ci.md).

**Docs, in order:** `node_modules/turbo/schema.json` (every key and `futureFlags` entry for the pinned version), `node_modules/turbo/docs/` or `pnpm turbo docs <query>` (version-matched; the upstream-locked `turborepo` skill points there), Context7 `/vercel/turborepo`, then `turborepo.dev`. `agentGuidance: false` stops turbo writing its own pointer block into root `AGENTS.md`, which would cost context every session.

## Task graph

- **`transit` is a no-op edge** (transit-node pattern): `check-types` and `test` depend on `transit`, not `^check-types`, so packages run in parallel yet invalidate when a dependency's source changes. App-to-app service bindings are not package dependencies: a Worker-name string binding reads nothing from the callee and needs no edge; whether typed cross-Worker RPC adds a `<callee>#transit` edge is decided with the first `worker-*` ([service-bindings.md](../backend/service-bindings.md)).
- **`check-types` depends on `types`**: the generated `.cloudflare/types/index.d.ts` is gitignored, so `check-types` cannot hash it as a tracked input and a fresh clone type-checks with no manual step. `types` is cached (input `cloudflare.config.ts`, output `.cloudflare/types/**`, hash also covers the lockfile's cf and workerd versions). No drift check: nothing generated is committed.
- **`build` is deliberately not gated on `check-types`**: `check-types` hashes `tests/`, so the edge made every test-only edit rebuild; with it gone and tests excluded from `build` inputs, a test-only edit keeps the build cached and out of `--affected`. The type gate lives in `pnpm run ci`, CD's `turbo run check-types build`, and the `deploy` / `upload` → `check-types` edges. So `turbo run build` alone never type-checks: name both (`turbo run check-types build --filter=<app>...`).
- **`deploy:check` is `cf deploy --prebuilt --dry-run` as a cached task**, depending on `build` only, with `inputs: ["cloudflare.config.ts"]` (an empty list would mean every file): it validates the Build Output, so its hash follows `build` and a test-only edit leaves it cached and out of `--affected`. It is not `deploy -- --dry-run`, because turbo hashes pass-through args into every task of the graph, so every dependency misses the cache.
- **`global.inputs` is prepended to every task's `inputs`**, not folded into one global hash, so a task can drop an entry with a negation glob. Never add OXC configs there: they belong to `//#lint:*` / `//#format:check`, and a global entry would invalidate `check-types` and `build` on a lint-only edit.
- **`//#hooks:test` is uncached** (`guard-secret-commit` shells out to git against the live index; the suite takes ~1 s) and sits in `check` and `ci` because the guards fail closed: a syntax error in a git guard denies every Bash command.
- **App `dev` tasks are `interruptible`** so `turbo watch` can restart them; `front-app#dev` runs `with: ["worker-api#dev"]` so a filtered front dev still has a gateway. `worker-api#dev` passes `SENTRY_DSN` through so a local secret can come from the shell as well as the app's `.env`: `envMode: "strict"` strips anything unlisted.
- **`global.passThroughEnv`** lists cf's `CF_SEND_TELEMETRY`, `DO_NOT_TRACK`, `CLOUDFLARE_REGISTRY_PATH` beside the `WRANGLER_*` entries, which stay for the Vitest pool and the Wrangler-only commands, and `SKIP_ENV_FILES`, which every app's `vite.config.ts` reads, so a new app inherits it ([workers-config.md](../backend/workers-config.md)).
- **`futureFlags.filterUsingTasks` stays off**: in 2.11.4 it makes `--filter=...pkg` follow task edges only, silently dropping dependent packages for the transit tasks, and CD's `--filter='./apps/*...'` relies on the package expansion; `--affected` already gets task precision from `affectedUsingTaskInputs`. Before re-enabling, confirm `turbo run check-types test --filter=...@repo/dtos-common --dry=json` still lists both apps.

## Inspecting the graph

Prefer read-only `turbo query` over speculative dry runs: `turbo query affected [--tasks build | --packages]`, `turbo query ls [pkg]`, `turbo query --schema` (load before writing a custom query).

A task hash covers its resolved `inputs`, `env` values, the package's external lockfile dependencies, and the hash of every task it `dependsOn`, so a miss no own input explains usually comes from a dependency task.

- `turbo run <task> --filter=<pkg> --dry=json`: per-task `hash`, resolved `inputs`, `environmentVariables`, `dependencies`, without running.
- `turbo run <task> --filter=<pkg> --summarize` twice, then diff the two `.turbo/runs/<run-id>.json`: which input, env var, or dependency hash moved.
- `turbo query affected --base <ref> --head <ref>`: `reason.__typename` (`TaskFileChanged`, `TaskDependencyTaskChanged`, `TaskGlobalFileChanged`, …) says why a task is selected. It counts uncommitted changes even with `--head` (a dirty `turbo.json` or root `package.json` marks everything `TaskGlobalFileChanged`); reason about a clean range in a scratch `git clone`.
- In the Claude Code sandbox, a dry run whose task list includes `front-app#build` hashes that task's `.env*` inputs, readable only through the `**/apps/front-app/.env*` allow; without it traversal aborts (the same reason `ci:sandbox` drops `build`).

## Root tasks (`//#`)

Repo-wide checks - `//#lint:check`, `//#lint:agent`, `//#format:check`, `//#deps:check`, `//#deps:format:check`, `//#hooks:test` - each map 1:1 to the root `package.json` script of the same name and run as one process at repo-root CWD, so `check` / `ci` / `ci:agent` schedule them in parallel from one `turbo run`.

- **Always address them with the `//#` prefix**: a bare `turbo run lint:check` would fan out to any workspace that later adds a same-named script - the per-package `oxlint` that breaks the Tailwind rules.
- **`//#deps:check` and `//#deps:format:check` are cached with hand-authored `inputs`**: the workspace manifests, `pnpm-workspace.yaml`, `.syncpackrc.json` - everything syncpack reads, verified with `--dry-run=json`. Extend them if `pnpm-workspace.yaml` adds a workspace directory.
- **Every other root task stays `cache: false`**: a root task's `$TURBO_DEFAULT$` spans the repo, so caching needs hand-authored `inputs`, verified with `--dry-run=json` - explicit globs ignore `.gitignore` (a bare `**/package.json` matches nested `node_modules` manifests). An under-specified hash yields a cached pass over unchecked code.
- **`//#lint:check` stays uncached**: `typeAware: true` couples it to the whole tsconfig graph plus the Tailwind entry point.
- **Type-aware lint reads the gitignored `.cloudflare/types`**, so `check`, `fix`, the `ci*` scripts, the stop gate, and CI run `pnpm run types` first. A root task cannot depend on `<app>#types` without listing apps, so that ordering lives in the callers.
- **`audit` and `boundaries` are never `turbo run` tasks**: `pnpm audit` is not a pure function of the commit (the advisory DB changes daily, and `envMode: "strict"` would strip the proxy/registry vars it inherits); `boundaries` is the `turbo boundaries` CLI verb.

## Remote cache

Enabled and signed (`remoteCache.signature: true`, `longerSignatureKey`). Local dev and CI need `TURBO_REMOTE_CACHE_SIGNATURE_KEY` (>= 32 bytes, the same value everywhere) alongside `TURBO_TOKEN` / `TURBO_TEAM`, or signed fetches fail closed; without the key, expect remote misses - local caching is unaffected. Rotating the key invalidates every signed artifact once.

A dev machine gets none of them automatically: `turbo login && turbo link`, or export all three in the shell profile, never committed. Verify with a task CI already built: a cold local cache logs `cache hit, replaying logs`. Without them the machine is local-cache-only, by design.

On 4 cores / <4 GB RAM, pass `--concurrency=2` on heavy graphs; never lower `concurrency` in `turbo.json` (it would slow CI).
