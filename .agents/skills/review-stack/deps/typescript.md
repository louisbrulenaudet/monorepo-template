---
id: typescript
summary: shared presets, strictness, resolution, TS 7 readiness
families: [toolchain]
packages: [typescript, @types/node]
paths: [packages/typescript-config/**, **/tsconfig*.json, .claude/rules/quality/typescript-config.md]
---

# TypeScript

TypeScript configuration: strictness, module resolution, and preset layout for a pnpm/Turborepo monorepo on the newest major line.

## Ground truth

- **Stale-knowledge risk**: this repo tracks the newest major line (`typescript` in the catalog), including TS 7 native-preview readiness.
- **Collector**: "TypeScript" - compiler options, module resolution (`bundler`), `verbatimModuleSyntax`, project references / incremental options, new-major behavior changes.
- **Web fallback**: `typescriptlang.org/tsconfig`, official release notes/blog for the installed major.
- **Version currency**: catalog `typescript`, `@types/node` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); check the installed major's migration notes for deprecated/renamed flags in any tsconfig.

## Scope

- [packages/typescript-config/](../../../../packages/typescript-config/) - `library.json`, `strict.json`, `vite-node.json`, `vite-react.json`, `workers.json`
- Per-app configs: [apps/front-app/tsconfig.json](../../../../apps/front-app/tsconfig.json) (+ `tsconfig.app.json`, `tsconfig.node.json`), [apps/worker-api/tsconfig.json](../../../../apps/worker-api/tsconfig.json), packages' tsconfigs
- [.claude/rules/quality/typescript-config.md](../../../../.claude/rules/quality/typescript-config.md) ↔ `.cursor` twin
- `check-types` task wiring; generated `worker-configuration.d.ts` handling

## Probe

Read every preset and consuming tsconfig; map preset → consumers.

## Axes

- **Strictness**: every app/package extends the strictest appropriate preset; no unjustified per-app weakening; exact-optional/bind/call flags consistent with current recommendations.
- **Module resolution & emit**: `moduleResolution: bundler` (or current recommendation) for Vite/Workers; no `noEmit` conflicts; `verbatimModuleSyntax` / type-import discipline; `isolatedModules` for single-file transpilers.
- **Monorepo layout**: presets consumed everywhere (no drift); workspace imports over path aliases, never importing an app; precise include/exclude (tests, generated files).
- **Workers specifics**: workers preset matches runtime types (`worker-configuration.d.ts`, `types` ordering); `nodejs_compat` reflected in lib settings.
- **Version currency**: new flags worth adopting; deprecated flags flagged; `@types/node` aligned with the Node 24 engine.
- **Agent loop**: `turbo run check-types` caching effective; error output stable; presets documented so agents extend the right one.

## Critical when

Unsafe weakenings; broken resolution; deprecated flags that error on the installed version.

## Overlaps

Type-aware lint rules (tsgolint) belong to `oxc`; `worker-configuration.d.ts` freshness belongs to `wrangler`.

## Accepted

- Preset choices in [.claude/rules/quality/typescript-config.md](../../../../.claude/rules/quality/typescript-config.md).
