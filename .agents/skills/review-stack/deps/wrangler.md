---
id: wrangler
summary: wrangler.jsonc currency, bindings, envs, types, deploy flow
families: [workers]
packages: [wrangler]
paths: [apps/*/wrangler.jsonc, apps/*/worker-configuration.d.ts, .github/workflows/cd.yml, .github/workflows/preview.yml, .claude/rules/backend/workers-config.md, .claude/rules/ops/previews.md]
---

# Wrangler

Every `wrangler.jsonc` and the Workers CLI workflow: config currency, binding hygiene, environments, generated types, and deploy flow.

## Ground truth

- **Stale-knowledge risk**: frequent releases; JSONC-only features appear regularly.
- **Collector**: "Wrangler" - config fields, CLI subcommands, `wrangler types`, versions upload/deploy; the vendor documentation MCP takes precedence for vendor questions.
- **Local schema**: [node_modules/wrangler/config-schema.json](../../../../node_modules/wrangler/config-schema.json) is authoritative for field validity at the installed version.
- **Local skill**: `.agents/skills/wrangler/SKILL.md`, `.agents/skills/workers-best-practices/SKILL.md`.
- **Web fallback**: `developers.cloudflare.com/workers/` - config reference, compatibility-dates changelog, observability, Previews.
- **Version currency**: catalog `wrangler` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml) + installed version; recent compatibility-date entries relevant to flags in use.

## Scope

- [apps/worker-api/wrangler.jsonc](../../../../apps/worker-api/wrangler.jsonc), [apps/front-app/wrangler.jsonc](../../../../apps/front-app/wrangler.jsonc)
- Generated `apps/*/worker-configuration.d.ts` vs configs (`pnpm types` / `pnpm types:check`)
- `secrets.required` per app (local values in `.env`, never `.dev.vars`); rule `backend/workers-config`
- Deploy pipeline: root `deploy` / `promote` / `upload` scripts and [.github/workflows/cd.yml](../../../../.github/workflows/cd.yml) (paused state documented)

## Probe

Read both `wrangler.jsonc` against the local schema; run `pnpm types:check`.

## Axes

- **Config currency**: `compatibility_date` within ~30 days; no stale flags (e.g. explicit `nodejs_compat` already implied); fields valid against the installed schema.
- **Bindings**: each declared binding used in code and vice versa; service bindings for Worker-to-Worker RPC; one DB owner, no duplicate DB bindings across apps.
- **Environments**: dev/staging/production blocks consistent (vars, observability sampling, `preview_urls`, `previews`); fail-closed CORS wiring; no secrets in `vars`.
- **Observability**: logs/traces enabled with sensible per-env sampling; `send_metrics` intentional.
- **Assets & SPA**: front-app assets config correct (`single-page-application`); gateway never co-located as the assets Worker.
- **Types & deploy workflow**: `worker-configuration.d.ts` committed and matching; `versions upload` → `versions deploy` aligned with current guidance; CD guard state documented.
- **Agent loop**: `$schema` in every jsonc; `secrets.required` lists every secret name; `pnpm types` deterministic.

## Critical when

Assumptions broken by the compatibility date; invalid fields; secrets in `vars`.

## Overlaps

The Cloudflare Vite plugin belongs to `vite`; the Workers Vitest pool belongs to `vitest`; Hono code belongs to `hono`.

## Accepted

- Config policy in [.claude/rules/backend/workers-config.md](../../../../.claude/rules/backend/workers-config.md); CD and Previews are paused behind `CD_ENABLED` / `PREVIEWS_ENABLED` on purpose.
