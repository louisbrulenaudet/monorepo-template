---
name: review-typescript
description: "TypeScript setup review (shared presets in packages/typescript-config, per-app tsconfigs, TS 7 readiness) against current official best practices. USE WHEN: user runs /review-typescript or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review TypeScript

Review the TypeScript configuration for alignment with current official best practices - strictness, module resolution, and project layout for a pnpm/Turborepo monorepo on a recent major TypeScript. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "strictness", "module resolution") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of TypeScript may be outdated - this repo tracks the newest major line (`typescript` in the catalog). **Do not draft suggestions from memory alone.**

1. Resolve "TypeScript" via the **Context7 MCP** (`resolve-library-id` → `query-docs`): current compiler options, module resolution strategies (`bundler`), `verbatimModuleSyntax`, project references / incremental options, and any new-major behavior changes.
2. For anything Context7 lacks, use **Firecrawl search/scrape restricted to the official domains** (`typescriptlang.org/tsconfig`, official release notes/blog for the installed major).
3. Version currency: catalog `typescript` + `@types/node` in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) vs latest stable; check the installed major's migration notes for deprecated/renamed flags used anywhere in repo tsconfigs.
4. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [packages/typescript-config/](../../../packages/typescript-config/) - `library.json`, `strict.json`, `vite-node.json`, `vite-react.json`, `workers.json` presets
- Per-app configs: [apps/front-app/tsconfig.json](../../../apps/front-app/tsconfig.json) (+ `tsconfig.app.json`, `tsconfig.node.json`), [apps/worker-api/tsconfig.json](../../../apps/worker-api/tsconfig.json), packages' tsconfigs
- [.claude/rules/quality/typescript-config.md](../../../.claude/rules/quality/typescript-config.md) ↔ `.cursor` twin
- `check-types` task wiring in root/turbo configs; generated `worker-configuration.d.ts` handling

## Analysis axes

- **Strictness**: all apps/packages extend the strictest appropriate preset; no per-app weakening without justification; exact optional/bind/call flags consistent with current recommendations.
- **Module resolution & emit**: `moduleResolution: bundler` (or current recommendation) for Vite/Workers targets; no `noEmit` conflicts; `verbatimModuleSyntax` / type-import discipline; `isolatedModules` correctness for single-file transpilers.
- **Monorepo layout**: shared presets actually consumed everywhere (no drift); path aliases vs workspace imports policy (`workspace:*`, never importing an app); include/exclude surfaces precise (tests, generated files).
- **Workers specifics**: workers preset matches Cloudflare runtime types (`worker-configuration.d.ts`, `types` ordering); nodejs_compat implications reflected in lib settings.
- **Version currency**: new flags worth adopting in the installed major; deprecated flags flagged; `@types/node` aligned with Node 24 engines.

## DX & AI-agentic workflow

Verify agent-friendliness: `turbo run check-types` caching effective; error output stable/actionable; presets documented so agents extend the right preset instead of hand-editing tsconfigs.

## Steps

1. Collect ground truth before reading config.
2. Read every preset and consuming tsconfig; map preset → consumers.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - unsafe weakenings, broken resolution, deprecated-and-erroring flags.
2. **Improvements** - strictness/resolution alignment with current guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
