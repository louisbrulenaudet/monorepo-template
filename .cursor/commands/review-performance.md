# Review performance command

Run a **performance-focused** review: algorithmic complexity, data structures, memory leaks, bundle size, critical path, cache strategy, images, and Worker cold starts. Your reply must be a **plan of suggested changes**: concise, actionable, and structured—not only prose.

## Cursor command usage

This file is a [Cursor custom command](https://docs.cursor.com/context/commands): plain Markdown in `.cursor/commands/`. When the user runs `/review-performance` in chat, this content is sent as the prompt.

- **Parameters:** Any text after `/review-performance` is scope—e.g. `/review-performance frontend only`, `/review-performance worker-api`—narrow accordingly. If none given, assume full performance review (frontend + worker-api).

This command is project-scoped and works with @ mentions and Rules. For a full review use `/review` instead.

## Best practices alignment

- **Algorithms and data structures** — Prefer O(n) or better for hot paths; avoid redundant loops, repeated sorts, or nested iterations over large collections; use appropriate structures (Map/Set for lookups, avoid repeated array scans).
- **Memory** — No closure or WeakRef leaks in long-lived Workers; no unbounded caches or growing global state; React effects and subscriptions cleaned up on unmount.
- **Frontend** — Critical path minimal; lazy load below-the-fold; `fetchpriority` for LCP; explicit dimensions to avoid CLS; code-splitting and tree-shaking; prefetch where beneficial.
- **Caching** — Cache TTLs and keys match content type (HTML vs assets vs API); no over-caching of dynamic content or under-caching of static; Cloudflare asset and API cache headers correct.
- **Worker and API** — Bundle size within limits (e.g. &lt; 1 MB compressed for Workers); no blocking I/O on critical path; cold start impact minimized (small deps, no heavy init).

Align with root [AGENTS.md](AGENTS.md) and app AGENTS.md for build and deployment model.

## Deep technical review

Conduct a performance-only review. Inspect the following and call out violations or improvements.

### Algorithmic complexity and data structures

- **Artifacts:** [apps/front-app/src/utils/](apps/front-app/src/utils/) and other hot paths, [apps/worker-api/src/](apps/worker-api/src/) (routes, handlers).
- **Checks:** No O(n²) or worse in hot paths. Filter/map/reduce chains: single pass where possible; avoid repeated `.find()` in loops (use Map). Sort once and reuse; avoid heavy work in render. Pagination or limits on large lists. worker-api: no N+1 patterns; batch or single queries where appropriate.

### Memory leaks and long-lived state

- **Artifacts:** [apps/worker-api/src/index.ts](apps/worker-api/src/index.ts), [apps/front-app/src/](apps/front-app/src/) (effects, subscriptions, global listeners).
- **Checks:** worker-api: no unbounded in-memory caches (or use TTL/eviction). No closures capturing request-specific data in global scope. Client: no timers or listeners without cleanup on unmount. No accumulating state in module scope across requests in Workers.

### Frontend critical path and bundle size

- **Artifacts:** [apps/front-app/vite.config.ts](apps/front-app/vite.config.ts), [apps/front-app/src/main.tsx](apps/front-app/src/main.tsx), [apps/front-app/src/App.tsx](apps/front-app/src/App.tsx), components under [apps/front-app/src/](apps/front-app/src/).
- **Checks:** Vite: code-splitting per route or chunk strategy (`React.lazy`, dynamic import); no single huge bundle without reason. Tree-shaking: avoid barrel imports that pull in unused code; check for side-effectful imports. Prefetch or preload for high-probability next navigation when added. LCP: hero or main image has `fetchpriority="high"` and appropriate size where applicable; no render-blocking scripts on critical path.

### Images and layout stability

- **Artifacts:** Images in [apps/front-app/src/](apps/front-app/src/) and [apps/front-app/public/](apps/front-app/public/).
- **Checks:** Modern formats where used; quality and dimensions appropriate (no oversized source). Lazy loading: below-the-fold images use loading="lazy"; above-the-fold do not. Explicit width/height or aspect-ratio to prevent CLS. Responsive srcset/sizes where relevant.

### Edge cache and static assets

- **Artifacts:** [apps/front-app/wrangler.jsonc](apps/front-app/wrangler.jsonc), Cloudflare dashboard or headers for static asset caching (as configured).
- **Checks:** Cache TTLs appropriate for hashed static assets vs HTML shell. API responses: Cache-Control and dynamic vs static content. No redundant revalidation on the critical path.

### worker-api: cold start and request path

- **Artifacts:** [apps/worker-api/src/index.ts](apps/worker-api/src/index.ts), [apps/worker-api/package.json](apps/worker-api/package.json), [apps/worker-api/wrangler.jsonc](apps/worker-api/wrangler.jsonc).
- **Checks:** Bundle size: keep under Cloudflare limits (e.g. 1 MB compressed); avoid large transitive deps if possible. No heavy sync work at top-level (module init); defer to request handler. External calls: timeouts set; no blocking on critical path when avoidable. Health route: minimal work for fast cold start signal.

### Network and payloads

- **Artifacts:** API routes, any fetch from `front-app` to `worker-api`.
- **Checks:** No duplicate requests for same resource (dedupe or cache). Payload size reasonable. Compression: gzip/brotli often at edge. Prefetch only for high-probability next navigation.

### Anti-patterns to flag

- O(n²) or worse in hot paths or request handlers.
- Unbounded in-memory cache or growing global state in Workers.
- LCP image without dimensions or without fetchpriority; lazy loading on LCP image.
- Single large JS bundle; no code-splitting for routes.
- Cache-Control missing or wrong for content type; caching dynamic API responses too aggressively.
- Blocking I/O or heavy init on Worker request path.
- Worker bundle bloated by unnecessary dependencies.

## Steps

1. **Gather scope** — Full performance or specific area (algorithms, frontend, cache, images, worker-api). Default to full.
2. **Read conventions** — AGENTS.md for build and Worker behavior.
3. **Inspect hot paths** — front-app utils and worker-api handlers; reason about complexity and data structures.
4. **Inspect Worker and React** — Long-lived state, caches, listeners; identify leak risks.
5. **Inspect frontend build and images** — vite.config.ts, component usage; bundle and CLS.
6. **Inspect cache strategy** — wrangler, headers, TTLs where applicable.
7. **Inspect worker-api** — Bundle size, init cost, external calls and timeouts.
8. **Compose plan** — Critical / Improvements / Optional; each item: **what**, **where**, **why**. One-line "no issues" per sub-area if none.

## Checklist

- [ ] Scope clear
- [ ] AGENTS.md consulted for build and Worker model
- [ ] Algorithmic complexity and data structures reviewed
- [ ] Memory and long-lived state (Worker, React) reviewed
- [ ] Frontend critical path, bundle, and code-splitting reviewed
- [ ] Images and CLS reviewed
- [ ] Edge cache / asset strategy reviewed
- [ ] worker-api cold start and request path reviewed
- [ ] Plan structured as Critical / Improvements / Optional with what/where/why

## Context usage

- Use `@file` for vite.config.ts, worker-api index, image usage in components.
- Use `@code` for specific loops, cache logic, or image usage when suggesting changes.
- Use `@docs` for Vite/Cloudflare Worker limits and best practices.

If context is insufficient, suggest which files or @ references to add.

## Review checklist

- **Correctness:** Complexity claims and cache semantics are accurate; no incorrect optimizations.
- **Conventions:** Aligns with AGENTS.md (Vite SPA + worker-api responsibilities).
- **Quality:** Measurable or reasoned impact (e.g. "reduces complexity from O(n²) to O(n)").
- **Actionability:** Every suggestion is implementable (e.g. "use Map for lookup", "add width/height to image").
- **Trade-offs:** Note any (e.g. cache TTL vs freshness, bundle size vs features).
- **Scope:** Performance only; defer SEO or security to their reviews.

## Output format

Respond with a **plan** only (no implementation unless the user asks):

1. **Critical** – Must-fix (severe complexity, memory leak, broken cache, LCP/CLS regression).
2. **Improvements** – Worthwhile (better data structure, cache TTL, fetchpriority, code-split).
3. **Optional** – Nice-to-haves (minor refactor, prefetch tuning). Prefix with **Nit:** for non-blocking polish.

For each item: **what** to change, **where** (file/area), and **why**. If a sub-area has no findings, state it in one line.
