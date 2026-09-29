---
id: performance
summary: SPA bundle and critical path, Core Web Vitals, caching headers and edge cache, Worker request path, resource exhaustion and availability
model: sonnet
---

# Performance

Is the SPA's critical path lean and cached right, is the Worker's request path bounded, and can a single caller consume resources other callers need?

## Ground truth

- Rules: [frontend/vite-config](../../../../.claude/rules/frontend/vite-config.md) (Build, env, deps), [frontend/react](../../../../.claude/rules/frontend/react.md) (Entry, providers, bundle), [frontend/tanstack-router](../../../../.claude/rules/frontend/tanstack-router.md), [frontend/tanstack-query](../../../../.claude/rules/frontend/tanstack-query.md), [backend/workers-cache](../../../../.claude/rules/backend/workers-cache.md), [backend/hono-gateway](../../../../.claude/rules/backend/hono-gateway.md) (Timeout caveat, Workers runtime), [backend/workers-config](../../../../.claude/rules/backend/workers-config.md) (Optional performance / DX options).
- Skill `vercel-react-best-practices`, client rules only (`bundle-barrel-imports`, `bundle-preload`, `bundle-defer-third-party`, `rerender-derived-state-no-effect`, `js-index-maps`); never its `server-*` rules - the SPA has no SSR.
- Skill `workers-best-practices` (streaming, `waitUntil`, module-level state, [references/runtime-patterns.md](../../workers-best-practices/references/runtime-patterns.md)).
- Availability depth: [security-audit/RESOURCE-EXHAUSTION-AND-AVAILABILITY.md](../../security-audit/RESOURCE-EXHAUSTION-AND-AVAILABILITY.md) (Core discipline) - read, never edit.
- External numbers from a retrieved source only: [Core Web Vitals](https://web.dev/articles/vitals) (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

## Scope

`apps/front-*/src/**`, `apps/front-*/index.html`, `apps/front-*/vite.config.ts` (chunks, `_headers` generation), `apps/worker-*/src/**`, `packages/hono-middleware/src/**`, `cloudflare.config.ts` `limits` / `placement`. A path or workspace focus narrows to it.

## Probe

`git log --follow --format='%h %s' -- <file>`. Bundle numbers come from the `bundle-analyzer` agent, never from a build run here: when a finding needs chunk sizes, put it under Needs validation with "run the `bundle-analyzer` agent" as the check.

## Axes

- **Critical path**: routes split through `autoCodeSplitting` with thin `*.lazy.tsx` entries; heavy, rarely used components behind `React.lazy` + `<Suspense>`; non-critical third-party code deferred past first paint; large libraries imported from deep paths, not barrels; `import()` statically analyzable; vendor chunks per rule `frontend/vite-config`.
- **Preload and data**: router `defaultPreload: "intent"` with `defaultPreloadStaleTime: 0` so TanStack Query owns freshness; loaders warm the queries the route renders per rule `frontend/tanstack-query`, with no request waterfall between parent and child; no duplicate requests for one resource; `vite:preloadError` reloads once per session.
- **Rendering**: React Compiler is on, so a missing `useMemo` / `useCallback` is not a finding; flag state derived through `useEffect`, list keys by index where order changes, expensive work in render without `useTransition` / `useDeferredValue`, `.find()` inside loops where a `Map` fits.
- **Core Web Vitals**: the LCP element (hero image or heading) is not lazy-loaded and an LCP image has `fetchpriority="high"` and dimensions; every image and embed reserves space (`width`/`height` or `aspect-ratio`); fonts do not block text; no long task on input handlers (INP).
- **Caching**: hashed assets `Cache-Control: public, max-age=31536000, immutable` and HTML `no-cache` through the generated `_headers`; API responses carry an intentional `Cache-Control`; `EDGE_CACHE` use per rule `backend/workers-cache` - never cache a response and then return `no-store`, never cache a private response under a shared key.
- **Worker request path**: no heavy work at module init; no module-level mutable per-request state; bodies streamed, never buffered unbounded; floating promises only through `c.executionCtx.waitUntil()`; subrequests carry `AbortSignal.timeout()` because `hono/timeout` does not cancel the handler; `limits.cpuMs` sized to the Worker; `placement` only for a Worker fronting a centralized backend.
- **Resource exhaustion**: build an input → resource table for each public route (body size, array length, pagination size, regex input, subrequest fan-out) and check a cap exists per item **and** in aggregate; work that outlives the client (`waitUntil`, un-aborted `fetch`) is bounded; no retry loop without backoff and a ceiling; one caller cannot exhaust a quota others share (rate-limit binding, per-caller caps). Keep "availability" (shared impact) separate from "slow" (one caller's latency).

## Critical when

An unbounded input driving CPU, memory, subrequests, or paid spend from a public route; a cached private response; hashed assets uncached or HTML cached long enough to strand users on old chunks; the LCP element lazy-loaded; a regression past a Core Web Vitals threshold shown by a cited measurement.

## Overlaps

Headers other than `Cache-Control` (CSP, HSTS) belong to `security`; rate limiting as an abuse control to `security` (this domain reports only the capacity angle); Vite option currency to `review-stack vite`; TanStack Query / Router API usage to `review-stack tanstack-query` / `review-stack tanstack-router`. This domain owns Core Web Vitals, images and CLS, `Cache-Control`, and bundle shape.

## Accepted

- Build defaults left unset (`build.target`, `cssCodeSplit`, `assetsInlineLimit`, `chunkSizeWarningLimit`) and `reportCompressedSize` only for `analyze`: rule [frontend/vite-config](../../../../.claude/rules/frontend/vite-config.md).
- No Smart Placement on the edge gateway: rule [backend/workers-config](../../../../.claude/rules/backend/workers-config.md).
