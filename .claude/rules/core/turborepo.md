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
