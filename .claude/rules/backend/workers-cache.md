---
paths:
  - "**/cloudflare.config.ts"
  - "apps/worker-*/src/routes/**"
  - "apps/worker-*/src/index.ts"
  - "apps/worker-*/src/handlers/**"
---

# Workers Cache Rules

Tiered edge cache in front of Worker `fetch()` entrypoints (eyeball, binding `fetch()`, `ctx.exports.fetch()`) - not `caches.default`. Control with `Cache-Control` / `Cache-Tag`; purge with `ctx.cache.purge()` ([docs](https://developers.cloudflare.com/workers/cache/)). Out of scope: `webhook-*`, `front-app`. Depth: skill `workers-best-practices`.

- Unsafe methods: never cache; purge the `Cache-Tag` on writes. Probes and real-time responses: `no-store`. Public read-heavy GET: `public, max-age=N, stale-while-revalidate=M` + `Cache-Tag`.
- Auth'd shared GET: uncached gateway → strip `Authorization` → cached inner `fetch`. Per-user: `ctx.props` + strip `Authorization`.
- `worker-api`'s `cloudflare.config.ts` gives staging, production, and the Preview `EDGE_CACHE` - `cache: { enabled: true }` with `exports: { default: exports.worker({ cache: { enabled: false } }) }`. Development (and `TEST`, which spreads it) sets `cache: { enabled: false }` and `exports: {}`: the Vite plugin 2.0 beta's `vite dev` entry emits `export const <key> = …` for every `exports` key, so `exports.default` becomes `export const default` and workerd refuses to start ("Unexpected token 'default'"); builds and the Vitest pool are unaffected. Put `EDGE_CACHE` back on development once a plugin release starts `cf dev` with it.
- Never enable cache on the gateway and then return `no-store`: it still pays the tier lookup.
- Worker-to-Worker defaults to RPC, which is not cacheable. Use binding `fetch()` only for hot read paths where a HIT skips callee CPU. Debug with `Cf-Cache-Status`.
