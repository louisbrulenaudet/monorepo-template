---
paths:
  - "**/wrangler.jsonc"
  - "apps/worker-*/src/routes/**"
  - "apps/worker-*/src/index.ts"
  - "apps/worker-*/src/handlers/**"
---

# Workers Cache Rules

Tiered edge cache in front of Worker **`fetch()`** entrypoints (eyeball, binding `fetch()`, `ctx.exports.fetch()`). Not `caches.default`. Control via `Cache-Control` / `Cache-Tag`; purge via `ctx.cache.purge()`. [Docs](https://developers.cloudflare.com/workers/cache/). Out of scope: `webhook-*`, `front-app`. Depth: skill **`workers-best-practices`**.

## Repo invariants

- Unsafe methods: never cache; purge `Cache-Tag` on writes. Probes / real-time: `no-store`. Public read-heavy GET: `public, max-age=N, stale-while-revalidate=M` + `Cache-Tag`.
- Auth'd shared GET: gateway uncached → strip `Authorization` → cached inner `fetch`. Per-user: `ctx.props` + strip `Authorization`.
- Wrangler: `worker-api` enables root `"cache": { "enabled": true }` with `exports.default.cache.enabled: false`. Do not enable cache on the gateway then return `no-store` (still pays tier lookup). After `wrangler.jsonc` edits: `pnpm types` ([workers-config.md](workers-config.md)).
- Default Worker-to-Worker is **RPC** (not cacheable). Use binding `fetch()` only for hot read paths where a HIT skips callee CPU. Debug: `Cf-Cache-Status`.
