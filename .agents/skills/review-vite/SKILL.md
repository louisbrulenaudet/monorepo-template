---
name: review-vite
description: "Vite setup review (front-app vite.config.ts, build/performance options, @cloudflare/vite-plugin, devtools) against current official Vite best practices. USE WHEN: user runs /review-vite or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review Vite

Review the Vite configuration of `front-app` for alignment with current official Vite best practices - performance and developer experience for a scaling React 19 codebase (TanStack Router/Query) deployed globally via Cloudflare Workers. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "build options", "dev server") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of Vite may be outdated (this repo tracks Vite major versions closely). **Do not draft suggestions from memory alone.**

1. Resolve "Vite" via the **installed documentation MCP collector** (whatever documentation MCP server(s) this project registers - library resolvers, vendor doc servers); fetch current docs for build options, performance features, dev-server options, and plugin APIs. Do this also for `@cloudflare/vite-plugin` and any plugin under review.
2. For anything the collector cannot resolve or lacks, **complete context collection with a direct web fetch** restricted to the official domains (`vite.dev`, `developers.cloudflare.com`) - build guide, performance guide, Cloudflare Workers Vite plugin reference. Use whichever web fetch/search tools are available.
3. Version currency: compare catalog entries in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) (`vite`, `@cloudflare/vite-plugin`, `@vitejs/plugin-react`, `@vitejs/devtools*`, `rollup-plugin-visualizer`) and installed versions (`pnpm why <pkg>` or `pnpm --filter front-app exec vite --version`) against latest stable release notes; flag drift, breaking changes relevant to used options, and deprecated config keys.
4. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [apps/front-app/vite.config.ts](../../../apps/front-app/vite.config.ts)
- Catalog + installed versions of all Vite-related packages ([pnpm-workspace.yaml](../../../pnpm-workspace.yaml))
- [apps/front-app/wrangler.jsonc](../../../apps/front-app/wrangler.jsonc) (assets/build output integration)
- [apps/front-app/package.json](../../../apps/front-app/package.json) scripts; `.claude/rules/frontend/vite-config.md`
- Repo policy: SPA stays on `@cloudflare/vite-plugin`; never an `auxiliaryWorkers` co-location

## Analysis axes

- **Build options**: `build.target`, minify, sourcemap strategy, outDir hygiene; Rolldown-era defaults vs overrides that are now unnecessary.
- **Performance**: chunking/code-splitting (route-based chunks via TanStack Router), manual chunk decisions backed by evidence (`rollup-plugin-visualizer` output), preloading/prefetch behavior, dependency pre-bundling (`optimizeDeps`), no accidental double-bundling of shared deps.
- **Plugins & ordering**: plugin list order-sensitive correctness (`@tailwindcss/vite`, `@vitejs/plugin-react`, router plugin, TanStack devtools plugin, Cloudflare plugin); each plugin still needed and current.
- **Dev server**: proxy/port/HMR settings vs repo port registry (`backend/ports` rule, `strictPort`); startup cost; `server.warmup` opportunities.
- **Environment & modes**: `import.meta.env` surface (`VITE_*` client-exposed only, no secrets); mode-specific config (development/production/preview); `VITE_API_BASE_URL` handling consistent with CI script.
- **Cloudflare integration**: assets config, worker entry wiring, compatibility between plugin version and `wrangler.jsonc`.

## DX & AI-agentic workflow

Verify agent-friendliness: build output ignored per repo worktree policy; visualizer/devtools not polluting normal builds (gated behind env/flag); errors from `vite build` machine-readable enough for agents to act on.

## Steps

1. Collect ground truth before reading config.
2. Read scope artifacts; run version checks.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - broken builds, deprecated keys, security-relevant env leaks.
2. **Improvements** - measurable perf wins and best-practice alignment.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
