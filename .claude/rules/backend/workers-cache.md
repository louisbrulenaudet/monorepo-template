---
paths:
  - "apps/worker-*/src/**/*.ts"
  - "apps/worker-*/wrangler.jsonc"
---

# Workers Cache Rules

Tiered edge cache in front of Worker **`fetch()`** entrypoints only (eyeball, binding `fetch()`, `ctx.exports.fetch()`). Not `caches.default`. Control via `Cache-Control` / `Cache-Tag`; purge via `ctx.cache.purge()`. [Docs](https://developers.cloudflare.com/workers/cache/). Out of scope: `webhook-*`, `front-app`. Load **`workers-best-practices`** for runtime limits.

## Cache or not

| Situation | Action |
|-----------|--------|
| Unsafe methods (`POST`/`PUT`/`PATCH`/`DELETE`) | Never cache; purge `Cache-Tag` on writes |
| Probes / real-time / per-request unique | `no-store` or `private, no-store` |
| Public read-heavy GET | `public, max-age=N, stale-while-revalidate=M` + `Cache-Tag` |
| Auth'd GET (shared payload) | Gateway uncached → strip `Authorization` → cached inner `fetch` |
| Auth'd GET (per-user stable) | `ctx.props` (e.g. `userId`) + strip `Authorization` |
| `Set-Cookie` / unstripped `Authorization` / WebSocket / `Vary: *` | Auto-bypass or no cache |
| RPC (`env.BINDING.method()`) | Not cacheable - default binding style (free) |

## Wrangler

| Role | Config |
|------|--------|
| `worker-api` gateway | `"cache": { "enabled": true }` + `exports.default.cache.enabled: false` |
| `worker-*` backend | `"cache": { "enabled": true }` on read entrypoint |

**Anti-pattern:** don't enable cache on the gateway and return `no-store` - still pays tier lookup. Disable in `exports`. After `wrangler.jsonc` edits: `make types` ([workers-config.md](workers-config.md)).

## Hono headers (`c.json(..., status, headers)`)

- Probes: `Cache-Control: no-store`
- Static metadata: `public, max-age=3600`
- Read-heavy public API: `public, max-age=300, stale-while-revalidate=3600` + `Cache-Tag`
- `Vary: Accept` OK; never `Vary: *`

## RPC vs `fetch` (bindings)

**Default RPC** - free, no cache. **Use `fetch()` only** for hot read paths where a cache HIT skips expensive callee CPU:

| Call | Cache | Request | CPU |
|------|-------|---------|-----|
| RPC | No | Free | If callee runs |
| `fetch` HIT | Yes | Standard | None |
| `fetch` MISS/BYPASS | No | Standard | Billed |

Debug: `Cf-Cache-Status`. Purge scoped to owning entrypoint.
