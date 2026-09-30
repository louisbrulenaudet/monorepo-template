---
id: cf
summary: cloudflare.config.ts currency, modes, bindings, generated types, Build Output, deploy flow
families: [workers]
packages: [cf, wrangler]
paths: [apps/*/cloudflare.config.ts, apps/*/package.json, .github/workflows/cd.yml, .github/workflows/preview.yml, .github/actions/cd/**, .github/actions/previews/**, .claude/rules/backend/workers-config.md, .claude/rules/backend/service-bindings.md, .claude/rules/ops/previews.md, .agents/skills/cf/SKILL.md]
---

# Cloudflare CLI (cf)

Every `cloudflare.config.ts` and the `cf` workflow: config currency, modes, binding hygiene, generated types, Build Output, deploy flow, and the commands that still run on Wrangler.

## Ground truth

- **Stale-knowledge risk**: `cf` is a beta (`cf@1.0.0-beta.5`, exact pin) and the Cloudflare Vite plugin a per-push 2.0 snapshot; commands, flags, and config keys move between releases and postdate most training data.
- **Collector**: "Cloudflare Workers" for bindings, compatibility dates, observability, and Previews; the vendor documentation MCP takes precedence for vendor questions. The `cf` pages may not be indexed there - fetch them directly.
- **Local schema**: the `@cloudflare/config` declarations that `cf/config` re-exports are authoritative for `cloudflare.config.ts` keys at the installed version; `node_modules/cf/README.md`, `pnpm exec cf <command> --help`, and `pnpm exec cf schema <command words>` for the CLI surface.
- **Local skill**: `.agents/skills/cf/SKILL.md`, `.agents/skills/workers-best-practices/SKILL.md`.
- **Web fallback**: `developers.cloudflare.com/cf/` (migrate from Wrangler, command mapping, projects, `cloudflare-config`, CI, agents), `developers.cloudflare.com/workers/build-output/`, `developers.cloudflare.com/workers/` (compatibility-dates changelog, observability, Previews).
- **Version currency**: catalog `cf`, `@cloudflare/vite-plugin` (cf requires `>=2.0.0-0 <3`), and `wrangler` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml) + installed versions; recent compatibility-date entries relevant to flags in use.

## Scope

- [apps/worker-api/cloudflare.config.ts](../../../../apps/worker-api/cloudflare.config.ts), [apps/front-app/cloudflare.config.ts](../../../../apps/front-app/cloudflare.config.ts) - `DEPLOYMENTS` table, `test` / Preview branches, bindings
- Generated `apps/*/.cloudflare/types/index.d.ts` (gitignored; `pnpm types`, and the turbo `types` task before `check-types`)
- Secrets declared with `bindings.secret()`; a Worker `.env` gitignored, no `.dev.vars`; rule `backend/workers-config`
- App `build` / `deploy` / `upload` / `types` scripts; [.github/workflows/cd.yml](../../../../.github/workflows/cd.yml) and `.github/actions/cd/`; [.github/workflows/preview.yml](../../../../.github/workflows/preview.yml) and `.github/actions/previews/` (paused state documented)

## Probe

Read both `cloudflare.config.ts` against the installed `cf/config` types; run `pnpm check-types` (its `types` dependency regenerates the gitignored `Env` types first).

## Axes

- **Config currency**: `compatibilityDate` within ~30 days; no stale flags (no explicit `nodejs_compat` at 2026-08-04 or later); keys valid against the installed types.
- **Modes**: `development` / `staging` / `production` in one table, `test` for the Vitest pool, `ctx.isPreview` only under `--mode production`; an unknown mode throws; deployed Worker names unchanged per mode; one env shape and a single `return`, so the generated `Env` stays an interface.
- **Bindings**: each declared binding used in code and vice versa; every secret a `bindings.secret()` outside `test` / Preview; service bindings by Worker-name string for Worker-to-Worker RPC; one DB owner, no duplicate DB bindings across apps.
- **Observability**: logs/traces enabled with sensible per-mode sampling (the `worker-api` Preview persisted at sampling 1, the `front-app` Preview on production's); telemetry off (`DO_NOT_TRACK`, `CF_SEND_TELEMETRY`, and `WRANGLER_SEND_METRICS`, which cf also honors).
- **Assets & SPA**: front-app assets-only with `notFoundHandling: "single-page-application"`; `workersDev` left at its default unless custom domains only; the gateway never co-located as the assets Worker.
- **Build Output & deploy flow**: every `--prebuilt` command passes the mode the Build Output records; `cf workers versions create` → `cf workers deployments create` aligned with current guidance; Wrangler-only commands (tail, one secret, Preview delete and secrets) still pinned and documented; CD guard state documented.
- **Agent loop**: `pnpm types` deterministic; the discover → `cf schema` → `--help` → `--dry-run` loop and the no-deploy boundary documented in skill `cf`; a sandboxed `cf` skips a Worker `.env` it cannot read through `SKIP_ENV_FILES` (skill `cf`).

## Critical when

Assumptions broken by the compatibility date; invalid config keys; a secret as a text binding in a deployed mode; a mode that falls through instead of throwing; a `--prebuilt` step whose `--mode` differs from the build's.

## Overlaps

`vite.config.ts` (the Cloudflare Vite plugin, build and dev-server settings) belongs to `vite`; the Workers Vitest pool belongs to `vitest`; Hono code belongs to `hono`.

## Accepted

- Config policy in [.claude/rules/backend/workers-config.md](../../../../.claude/rules/backend/workers-config.md); CD and Previews are paused behind `CD_ENABLED` / `PREVIEWS_ENABLED` on purpose.
- Exact pins for `cf` and `@cloudflare/vite-plugin`: both are betas, and the plugin ships a snapshot per push.
- `wrangler` stays a root devDependency for tail, single-secret put, and Preview delete / secrets, which cf lacks; `WRANGLER_OUTPUT_FILE_PATH` carries the version-upload record until cf prints JSON for `versions create`.
