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

## Remote cache

Remote caching is enabled **and signed** (`remoteCache.signature: true`, `longerSignatureKey`). Local dev and CI need `TURBO_REMOTE_CACHE_SIGNATURE_KEY` (**>= 32 bytes**) alongside `TURBO_TOKEN`/`TURBO_TEAM`, or signed fetches fail closed. Without the key set locally, expect remote-cache misses; local caching is unaffected. Rotation invalidates every previously signed artifact - one rebuild per task, then the cache re-populates.

### Provisioning a dev machine

CI gets `TURBO_TOKEN` / `TURBO_TEAM` / `TURBO_REMOTE_CACHE_SIGNATURE_KEY` from repo secrets (`.github/workflows/*.yml`); a dev machine gets nothing automatically. Either run `turbo login && turbo link`, or export all three in the shell profile - the signature key must be the same >= 32-byte value CI uses, and none of them may ever be committed. Verify with a task CI already built: a remote hit logs `cache hit, replaying logs` on a cold local cache. A machine without them runs local-cache-only by design - correct, just slower.

### Constrained machines

On small hardware (4 cores / <4 GB RAM), prefer `--concurrency=2` on heavy graphs (`pnpm turbo run check-types test build --concurrency=2`) to limit memory pressure from parallel tsc/vitest/vite. Guidance only - never lower `concurrency` in `turbo.json`; that would slow CI runners.
