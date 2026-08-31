---
name: review-wrangler
description: "Wrangler/Workers config review (wrangler.jsonc files, compatibility dates, bindings, observability, generated types) against current official Cloudflare best practices. USE WHEN: user runs /review-wrangler or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review Wrangler

Review all Wrangler configurations and Workers CLI usage for alignment with current official Cloudflare best practices - config currency, binding hygiene, environments, and deploy workflow on this Workers monorepo. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "compatibility date only", "observability") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of Wrangler may be outdated (frequent releases; JSONC-only features appear regularly). **Do not draft suggestions from memory alone.**

1. Resolve "Wrangler" via the **installed documentation MCP collector** (whatever documentation MCP server(s) this project registers - library resolvers, vendor doc servers) for current config fields, CLI subcommands, `wrangler types`, versions uploads/promotes.
2. For anything the collector cannot resolve or lacks, **complete context collection with a direct web fetch** restricted to the official domain (`developers.cloudflare.com/workers/`) - wrangler config reference, compatibility dates changelog, observability, migrations. Use whichever web fetch/search tools are available. A vendor documentation MCP, when one is installed, takes precedence for vendor questions.
3. Local schema ground truth: [node_modules/wrangler/config-schema.json](../../../node_modules/wrangler/config-schema.json) is authoritative for field validity at the installed version.
4. Version currency: catalog `wrangler` in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) + installed version vs latest stable; check recent compatibility-date entries relevant to flags in use.
5. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [apps/worker-api/wrangler.jsonc](../../../apps/worker-api/wrangler.jsonc), [apps/front-app/wrangler.jsonc](../../../apps/front-app/wrangler.jsonc)
- Generated types: `apps/*/worker-configuration.d.ts` freshness vs configs (`pnpm types` / `pnpm types:check`)
- `.dev.vars.example` per app; secrets path-scoping rule (`backend/workers-config`)
- Deploy pipeline: root scripts (`deploy`, `promote`, `upload`) and [.github/workflows/cd.yml](../../../.github/workflows/ci.yml) (paused state documented)

## Analysis axes

- **Config currency**: `compatibility_date` within ~30 days of today; no stale flags (e.g. explicit `nodejs_compat` flag when the date already enables it); fields valid against installed schema.
- **Bindings**: each declared binding used in code and vice versa; service bindings preferred for Worker-to-Worker RPC; single DB owner per repo decision checklist; no duplicate DB bindings across apps.
- **Environments**: dev/staging/production env blocks consistent (vars, observability sampling, `preview_urls`); fail-closed CORS wiring intact; no secrets in `vars`.
- **Observability**: logs/traces enabled with sensible sampling per environment; `send_metrics` choice intentional.
- **Assets & SPA**: front-app assets config correct (`single-page-application` handling); gateway not co-located as assets Worker (repo anti-pattern rule).
- **Types & deploy workflow**: `worker-configuration.d.ts` committed and matching; `versions upload` → `versions deploy` flow aligned with current Wrangler guidance; CD guard state documented.

## DX & AI-agentic workflow

Verify agent-friendliness: `$schema` pointer present in every jsonc so agents get validation; `.dev.vars.example` documents every var/secrets name; `pnpm types` regenerates deterministically.

## Steps

1. Collect ground truth before reading config.
2. Read both wrangler.jsonc files against the local schema; run `pnpm types:check` to verify committed types.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - expired compat behavior assumptions, invalid fields, secret leaks into `vars`.
2. **Improvements** - config/binding alignment with current platform guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
