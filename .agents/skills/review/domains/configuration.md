---
id: configuration
summary: cloudflare.config.ts modes and Previews, bindings and secrets declaration, env files, client env, ports, what ships in the Build Output
model: sonnet
---

# Configuration

Does each app declare the same, fail-closed configuration in every mode, keep secrets declared and out of files, and ship only what it should?

## Ground truth

- Root [AGENTS.md](../../../../AGENTS.md) (Environment, Bindings / secrets row, cf CLI).
- Rules: [backend/workers-config](../../../../.claude/rules/backend/workers-config.md), [backend/ports](../../../../.claude/rules/backend/ports.md), [backend/workers-cache](../../../../.claude/rules/backend/workers-cache.md), [frontend/vite-config](../../../../.claude/rules/frontend/vite-config.md) (Config shape, Build, env, deps), [ops/previews](../../../../.claude/rules/ops/previews.md), [quality/typescript-config](../../../../.claude/rules/quality/typescript-config.md) (Worker tsconfig includes).
- Skill `cf` (modes, Build Output `config.json`, types); `workers-best-practices` [references/configuration.md](../../workers-best-practices/references/configuration.md).
- For mode and deployment drift: [security-audit/CLOUD-AND-DEPLOYMENT.md](../../security-audit/CLOUD-AND-DEPLOYMENT.md) (Universal moves) - read, never edit.

## Scope

Every `apps/*/cloudflare.config.ts` and `apps/*/vite.config.ts`, app `package.json` scripts (`dev`, `build`, `deploy`, `upload`, `preview`, `types`), `apps/*/turbo.json`, `apps/front-*/src/config/`, root `.gitignore`, root [turbo.json](../../../../turbo.json) (`envMode`, `env`, `passThroughEnv`). A workspace focus narrows to that app.

## Probe

`find apps -path '*/worker-*' -name '.env*' -not -path '*/node_modules/*'` (existence only - never read the files; each hit must be gitignored and untracked), `find apps -name '.dev.vars*' -not -path '*/node_modules/*'`, `git check-ignore -v <path>`, `grep -rn "import.meta.env" apps/front-*/src`, `pnpm types` (writes only the gitignored generated types).

## Axes

- **Mode matrix**: build one table per app - `development` / `staging` / `production` / `test` / Preview × Worker name, routes, `workersDev` / `previewUrls`, each binding, each secret, `ENVIRONMENT`, `CORS_ORIGINS` - and check it against rule `backend/workers-config`: an unknown mode throws, `ctx.isPreview` throws outside `production`, one `env` shape and one `return`, names `<app>` / `<app>-staging` / `<app>-production`, never production data bindings, queue consumers, crons, or routes in the Preview branch.
- **Fail closed**: every guard reading required config throws or returns 503 when the value is missing; an empty `bindings.text("")` stand-in (test, Preview) disables a feature and never turns a check off (no "no secret → skip verification"); `CORS_ORIGINS` empty is permissive only in `dev`.
- **Secrets declared, not stored**: every secret the code reads is `bindings.secret()` in each mode that reads it; never a `bindings.text()` value, code constant, or log; a Worker `.env` gitignored and untracked, no `.dev.vars` (report existence from the probe, never contents); `.env*` / `.dev.vars*` gitignored.
- **Config loading**: every `@repo/*` import in `cloudflare.config.ts` is type-only; `compatibilityDate` meets the rule's floor and never adds `nodejs_compat`; observability per deployment (sampling rates) matches the rule and the Sentry sampler that mirrors it.
- **Client env**: `front-*` `.env*` hold public `VITE_*` values only; `envPrefix` is never widened; client code reads env through `src/config/env.ts`, never scattered `import.meta.env.X` (except the literal `VITE_SENTRY_DSN` reads in `src/config/sentry.ts`, which let the build drop the SDK); the production build fails on missing or placeholder required `VITE_*` values; config-time env uses `loadEnv(mode, envDir, "VITE_")` with the same `envDir` as the returned config (`false` under `SKIP_ENV_FILES`).
- **What ships**: production source maps are `hidden` and excluded by the generated `.assetsignore`; no `.env`, map, or secret-bearing file in the client assets; `_headers` and `.assetsignore` are generated, never hand-edited; every `--prebuilt` script passes the mode the Build Output records.
- **Build inputs and env passthrough**: `apps/front-app/turbo.json` `build` inputs cover the `.env*` files that change the bundle; `envMode: strict` lists every variable a task needs in `env` / `passThroughEnv` (e.g. `SENTRY_DSN` for `worker-api#dev`).
- **Ports and dev**: dev ports and `strictPort` per rule `backend/ports`; `inspectorPort: 0`; dev settings (minify, source maps, port) in `vite.config.ts`, never in `cloudflare.config.ts`.

## Critical when

A secret in a `bindings.text()` value, the repo, or the client bundle; a mode that silently falls back to development values; a Preview branch holding production data bindings, consumers, crons, or routes; an empty stand-in that disables a security check; a `--prebuilt` step without the recorded `--mode`; an `.env` inside a Worker app.

## Overlaps

Secret **leakage** (logs, error bodies, bundle) and CORS/CSRF behavior belong to `security`; cache headers to `performance`; `cf` / Wrangler flag validity and Vite option currency to `review-stack cf` / `review-stack vite`; TypeScript preset options to `review-stack typescript`; lockfile and engines to `ci`. This domain owns `bindings.secret()` declaration, modes, and Previews config.

## Accepted

- `workersDev: true` until custom domains serve the Worker; `previewUrls: true` in production only: rule [backend/workers-config](../../../../.claude/rules/backend/workers-config.md).
- Local secret values from a gitignored Worker `.env` or the shell, never a `.dev.vars`: root [AGENTS.md](../../../../AGENTS.md), Environment.
