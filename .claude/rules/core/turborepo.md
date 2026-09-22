---
paths:
  - "**/turbo.json"
  - ".github/workflows/**"
---

# Turborepo Query & Remote Cache

Read-only graph primitives and signed-cache provisioning for this repo's turbo setup. Task/pipeline semantics live in root `turbo.json` comments and `core/boundaries`; CI invariants live in `ops/ci`.

## Turbo query (agent primitives)

`turbo query` is the read-only way to inspect the graph without running tasks - prefer it over speculative dry runs:

| Command | Use |
|---------|-----|
| `turbo query affected` | Which tasks are affected by working-tree changes (JSON by default) |
| `turbo query affected --tasks build` | Same, scoped to one task name |
| `turbo query affected --packages` | Affected packages instead of tasks |
| `turbo query ls [pkg]` | Package list / per-package deps and tasks |
| `turbo query --schema` | GraphQL schema to load before writing custom queries |

## Root tasks (`//#`)

Repo-wide checks that cannot be per-package - OXC, Knip, syncpack - are declared in root `turbo.json` as `//#lint:check`, `//#lint:agent`, `//#format:check`, `//#knip`, `//#knip:agent`, `//#knip:production`, `//#deps:check`, `//#deps:format:check`. Each maps 1:1 to a root `package.json` script of the same name and runs as one process at repo-root CWD, so `pnpm run check` / `ci` / `ci:agent` can schedule them in parallel from a single `turbo run`.

- **Always address them with the `//#` prefix.** A bare `turbo run lint:check` would fan out to any workspace that later adds a same-named script, which is exactly the per-package `oxlint` that breaks the Tailwind context rules.
- **`//#deps:check` and `//#deps:format:check` are cached with hand-authored `inputs`**: the workspace manifests (`package.json`, `apps/*/package.json`, `packages/*/package.json`), `pnpm-workspace.yaml`, and `.syncpackrc.json` - the complete set syncpack reads, verified with `--dry-run=json`. Extend those globs if `pnpm-workspace.yaml` ever adds a workspace directory.
- **Every other root task stays `cache: false`.** A root task's `$TURBO_DEFAULT$` spans the whole repo, so caching without hand-authored `inputs` buys nothing. Before setting `cache: true` on one, author its `inputs` and verify the resolved file list with `turbo run <task> --dry-run=json` - explicit input globs do not honor `.gitignore` the way `$TURBO_DEFAULT$` does, so a bare `**/package.json` also matches nested `node_modules` manifests. An under-specified hash yields a cached *pass* over code that was never checked - a stale-green gate.
- **`//#lint:check` should stay uncached.** `typeAware: true` couples it to the entire tsconfig graph plus the Tailwind entry point; enumerating that correctly is not worth the staleness risk.
- **`audit` is never a root task.** `pnpm audit` is not a pure function of the commit (the advisory DB changes daily), and `envMode: "strict"` would strip the proxy and registry vars it inherits freely today. `boundaries` is likewise a CLI verb (`turbo boundaries`), not a task - keep both outside the `turbo run`.

## Remote cache

Remote caching is enabled **and signed** (`remoteCache.signature: true`, `longerSignatureKey`). Local dev and CI need `TURBO_REMOTE_CACHE_SIGNATURE_KEY` (**>= 32 bytes**) alongside `TURBO_TOKEN`/`TURBO_TEAM`, or signed fetches fail closed. Without the key set locally, expect remote-cache misses; local caching is unaffected. Rotation invalidates every previously signed artifact - one rebuild per task, then the cache re-populates.

### Provisioning a dev machine

CI gets `TURBO_TOKEN` / `TURBO_TEAM` / `TURBO_REMOTE_CACHE_SIGNATURE_KEY` from repo secrets (`.github/workflows/*.yml`); a dev machine gets nothing automatically. Either run `turbo login && turbo link`, or export all three in the shell profile - the signature key must be the same >= 32-byte value CI uses, and none of them may ever be committed. Verify with a task CI already built: a remote hit logs `cache hit, replaying logs` on a cold local cache. A machine without them runs local-cache-only by design - correct, just slower.

### Constrained machines

On small hardware (4 cores / <4 GB RAM), prefer `--concurrency=2` on heavy graphs (`pnpm turbo run check-types test build --concurrency=2`) to limit memory pressure from parallel tsc/vitest/vite. Guidance only - never lower `concurrency` in `turbo.json`; that would slow CI runners.
