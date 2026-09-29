---
id: vite
summary: front-app build/perf options, plugins, Cloudflare plugin in both apps
families: [frontend]
packages: [vite, vite-plus, @cloudflare/vite-plugin, @vitejs/plugin-react, @vitejs/devtools, @vitejs/devtools-oxc, @vitejs/devtools-rolldown, @vitejs/devtools-vite, @vitejs/devtools-vitest, @tanstack/devtools-vite, rollup-plugin-visualizer]
paths: [apps/*/vite.config.ts, apps/front-*/package.json, .claude/rules/frontend/vite-config.md]
---

# Vite

The `front-app` Vite configuration: build performance and DX for a React 19 / TanStack SPA deployed via Cloudflare Workers. Also the Cloudflare Vite plugin options, SSR build settings, and dev-server port in `worker-api`'s `vite.config.ts`, since `cf build` and `cf dev` run Vite for both apps.

## Ground truth

- **Stale-knowledge risk**: this repo tracks Vite majors closely.
- **Collector**: "Vite" - build options, performance features, dev-server options, plugin APIs; also `@cloudflare/vite-plugin` and any plugin under review.
- **Web fallback**: `vite.dev`, `developers.cloudflare.com` - build guide, performance guide, Workers Vite plugin reference.
- **Version currency**: catalog `vite`, `@cloudflare/vite-plugin`, `@vitejs/plugin-react`, `@vitejs/devtools*`, `rollup-plugin-visualizer` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml) and installed versions (`pnpm why <pkg>`, `pnpm --filter front-app exec vite --version`); flag deprecated config keys.

## Scope

- [apps/front-app/vite.config.ts](../../../../apps/front-app/vite.config.ts), [apps/worker-api/vite.config.ts](../../../../apps/worker-api/vite.config.ts)
- [apps/front-app/cloudflare.config.ts](../../../../apps/front-app/cloudflare.config.ts) (assets config; read for the build integration, owned by `cf`)
- [apps/front-app/package.json](../../../../apps/front-app/package.json) scripts; [.claude/rules/frontend/vite-config.md](../../../../.claude/rules/frontend/vite-config.md)
- Repo policy: SPA stays on `@cloudflare/vite-plugin`; never an `auxiliaryWorkers` co-location

## Probe

Read the scope; run the version checks above.

## Axes

- **Build options**: `build.target`, minify, sourcemap strategy, outDir hygiene; Rolldown-era defaults vs overrides now unnecessary.
- **Performance**: route-based chunks; manual chunks backed by visualizer evidence; preload/prefetch; `optimizeDeps`; no double-bundling of shared deps.
- **Plugins & ordering**: order-sensitive list (`@tailwindcss/vite`, `@vitejs/plugin-react`, router plugin, TanStack devtools plugin, Cloudflare plugin); each still needed and current.
- **Dev server**: proxy/port/HMR vs the port registry (rule `backend/ports`, `strictPort`); startup cost; `server.warmup`.
- **Environment & modes**: `import.meta.env` surface (`VITE_*` only, no secrets); mode-specific config; `VITE_API_BASE_URL` consistent with CI.
- **Cloudflare integration**: plugin options (`types.generate`, `inspectorPort`); client build in `.cloudflare/output/v0/workers/default/assets/` with the emitted `_headers` / `.assetsignore`; plugin version inside the range `cf` accepts (`>=2.0.0-0 <3`, exact snapshot pin).
- **Agent loop**: build output ignored per worktree policy; visualizer/devtools gated behind a flag; `vite build` errors actionable.

## Critical when

Broken builds; deprecated keys; security-relevant env leaks into the client bundle.

## Overlaps

Router plugin options belong to `tanstack-router`; Tailwind CSS content belongs to `tailwind`; `cloudflare.config.ts` fields belong to `cf`; every Sentry-specific line (plugin, debug IDs, `sentry-vendor` chunk, CSP DSN origin) belongs to `sentry`.

## Accepted

- Config rationale in [.claude/rules/frontend/vite-config.md](../../../../.claude/rules/frontend/vite-config.md) and the why-comments in `vite.config.ts`.
