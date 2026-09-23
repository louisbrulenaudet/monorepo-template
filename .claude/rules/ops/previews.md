---
paths:
  - "**/wrangler.jsonc"
  - ".github/workflows/preview.yml"
  - ".github/actions/previews/**"
---

# Worker Previews

Branch and PR testing uses [Worker Previews](https://developers.cloudflare.com/workers/previews/) (`wrangler preview`, Wrangler >= 4.135.0): an isolated Preview **under the production Worker** (`*-production`), with its own vars, bindings, URL, and observability. The pipeline is [`.github/workflows/preview.yml`](../../../.github/workflows/preview.yml); the scripts are `.github/actions/previews/`. Read them for the steps. Do not reach for Version URLs (`versions upload --preview-alias`) or a new Wrangler environment for branch testing - both run on shared resources.

## Config invariants

- **Every app declares `env.production.previews`**, even when empty - `wrangler preview` requires the block. **Vars and bindings are never inherited**: restate every one the code reads (`version_metadata` included), pointed at Preview-safe values. `observability`, `logpush`, `limits`, and `placement` fall back to the environment's values unless overridden. `assets` and `compatibility_*` stay top-level.
- **Every Preview command carries `--env production`** - `preview`, `preview delete`, `preview secret …`. Without it wrangler targets the top-level Worker.
- **`ENVIRONMENT` is `AppEnvironment.PREVIEW`** in Previews: strict CORS, and the only environment where a `CORS_ORIGINS` wildcard (`https://*-front-app-production.<subdomain>.workers.dev`, three or more labels after the wildcard label) is honored; a wildcard anywhere else returns 503. Every `=== AppEnvironment.PRODUCTION` gate treats a Preview as non-production (echo route, `Server-Timing`, pretty JSON), which is one more reason to keep Previews behind Access.
- **Never in `previews`:** production data bindings, queue consumers, cron triggers, routes. Previews cannot consume queues or run `scheduled()`; routes and crons always target production.
- **Service bindings from a Preview call the bound Worker's production deployment**, not its Preview. A PR that changes both sides of a binding is not integration-tested by Previews - keep the `createTestHarness` suite for that.
- **Durable Objects and Containers are isolated per Preview automatically; KV, D1, R2, Queues, Workflows are not.** Adding one of those means a separate Preview resource in `previews`, and - for anything holding client or matter data - a retention and deletion rule in the owning app's `AGENTS.md` (skill `privileged-legal-data`).

## Frontends (Vite plugin)

- The Cloudflare Vite plugin fixes the target environment **at build time** from `CLOUDFLARE_ENV`, and writes a redirected `dist/wrangler.json`. A build without it resolves the top-level Worker, and a later `--env production` is silently ignored against that redirect. `deploy-previews.sh` therefore builds with `CLOUDFLARE_ENV=production`, and `CLOUDFLARE_ENV` is a `build` env input in `apps/front-app/turbo.json`.
- The SPA's `VITE_API_BASE_URL` is the gateway **Preview** URL, which is why the gateway is previewed first (`monorepo.deployOrder`) and the frontend is built afterwards, with Cloudflare credentials unset.

## Exposure and credentials

- **`preview_urls: true` only takes effect through `wrangler deploy` or `wrangler triggers deploy`** - never through `versions upload`, which is all CD runs. Apply it once per app: `pnpm --filter=<app> exec wrangler triggers deploy --config wrangler.jsonc --env production`. It also exposes production Version URLs.
- **Preview URLs are public by default.** Enable Cloudflare Access on the `front-app` Preview URLs before arming `PREVIEWS_ENABLED`. Access on the **gateway** Preview hostname redirects the SPA's cross-origin `fetch` to a login page and breaks it: the gateway Preview relies on its `CORS_ORIGINS` allowlist, unless you configure the Access application's CORS settings and send credentials from the SPA. The workflow's `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` service token only passes Access once a **Service Auth** policy includes it.
- Credentials live on the `preview` GitHub Environment, step-scoped exactly as in [`cd.md`](cd.md). The token edits the production Worker's scripts, so it is as powerful as the CD token: account-scoped Workers Scripts Edit, never a Global API Key. Fork and Dependabot PRs never run the job; never switch to `pull_request_target`.
- Secrets for Previews: `wrangler preview base-config secret put KEY --env production` (applies to **new** Previews only) or `wrangler preview secret put KEY --name <preview> --env production`. Never production secret values.

## Limits

100 Previews per Worker (Free) / 500 (Paid), 100 deployments per Preview; the least-recently-deployed Preview is evicted first. Closed PRs delete theirs (`cleanup` job); branch Previews created locally are yours to delete.

## Agent loop

0. Once per account: set `env.production.previews.vars.CORS_ORIGINS` in `apps/worker-api/wrangler.jsonc`, and apply `preview_urls` (above). Empty `CORS_ORIGINS` makes the gateway smoke answer **503**; a missing `preview_urls` leaves the Preview without a URL. The script names both fixes.
1. `pnpm preview:deploy` - Preview named after the branch (or `PREVIEW_NAME=…`), smoked at each app's `monorepo.healthPath`, URLs printed. `.claude/settings.json` denies it to agents: hand it to the user as `! pnpm preview:deploy`, or push the branch and read the Previews comment the workflow posts (`gh pr view <n> --comments`).
2. Exercise the URL with `curl` (send `X-Request-Id` to correlate).
3. Read logs and traces through the `cloudflare-observability` MCP server or the Preview's Observability tab - `wrangler tail` cannot target Previews.
4. Patch, rerun step 1 (same name updates the same Preview), then `pnpm preview:delete`.
