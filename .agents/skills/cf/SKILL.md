---
name: cf
description: "USE WHEN: running, finding, or troubleshooting Cloudflare CLI (`cf`) commands in this repo - dev servers, builds and their Build Output, `Env` types, startup profiling, local KV/D1/R2 data, the commands that still need Wrangler, or the cf equivalent of a Wrangler habit. DO NOT USE WHEN: editing application code."
---

# Cloudflare CLI (cf)

`cf` (`cf@1.0.0-beta.5`, exact catalog pin) replaces Wrangler for dev, build, types, and deploy. Each app is configured by a typed `apps/<app>/cloudflare.config.ts` and built through the Cloudflare Vite plugin 2.0 beta (`apps/<app>/vite.config.ts`). `cf` is a devDependency of the root and of each app: run it through the package scripts or `pnpm --filter=<app> exec cf …`, never a global install. The beta changes between releases, so the installed `--help` beats memory and these notes.

## Find the command

1. `pnpm exec cf cli search "<task>"` - local search, top 5 matches as JSON. Describe the action and the resource type (`list kv keys`, `apply d1 migrations`), never names, IDs, domains, or tokens: the query travels with telemetry when telemetry is on.
2. `pnpm exec cf schema <command words>` - the API request a generated command sends (`pnpm exec cf schema d1 raw`).
3. `pnpm exec cf <command words> --help` - flags at the installed version. `--force` is sometimes an API parameter rather than a confirmation skip: read the help before passing it.
4. `--dry-run` where the help lists it - prints the request, or builds and checks without uploading.
5. Run it.

## Project commands

Run from the repo root; each script runs in its app directory, next to `cloudflare.config.ts`.

| Task | Command | Notes |
|------|---------|-------|
| Dev server | `pnpm --filter=<app> dev` (`cf dev`) | Runs Vite and forwards only `--mode`; ports stay in `vite.config.ts` (rule `backend/ports`). Background task and readiness: skill `run-app` |
| Build | `pnpm turbo run build --filter=<app>` (`cf build`) | Production mode; writes `.cloudflare/output/v0/` |
| `Env` types | `pnpm types` (`cf workers types`, worker-api) | The turbo `types` task also runs before `check-types`; front-app has type generation off |
| Startup profile | `pnpm --filter=worker-api exec cf workers check --prebuilt --mode production`, after a build | JSON bundle size and startup timings; writes `worker-startup.cpuprofile` (gitignored). Needs a Worker entrypoint, so not front-app |
| Deploy, upload | `pnpm run deploy`, `pnpm run upload` | Humans and CD only |

## Modes and Build Output

- `cf dev` runs mode `development`; `cf build` and `cf deploy` run `production` unless given `--mode staging`; the Workers Vitest pool loads `test`; a Preview build is `ctx.isPreview` under `production`. Any other mode throws in `cloudflare.config.ts`.
- Select a mode with `--mode`, never Wrangler's `--env`.
- Build Output, per app under `.cloudflare/output/v0/`: `config.json` (records `buildContext.mode` and `isPreview`), `workers/default/worker.config.json`, `workers/default/bundle/` (the Worker plus its `.map` files, uploaded as source maps), `workers/default/assets/` (the client build).
- Every `--prebuilt` command passes exactly the mode `config.json` records; a mismatch fails ("The Build Output was created with mode …"). Preview output deploys only through `cf previews deploy --prebuilt`.
- `.cloudflare/**` (Build Output, `types/`, local dev `state/`) is generated and gitignored, and the edit hook blocks hand edits. Change `cloudflare.config.ts` or the source, then rebuild or run `pnpm types`.

## Types

`.cloudflare/types/index.d.ts` declares the global `Env` and `Cloudflare.Env`, inferred from the whole `cloudflare.config.ts` default export, plus workerd runtime types. After changing `cloudflare.config.ts`: `pnpm types`, then `pnpm check-types`. Keep one env shape across modes and a single `return` in the factory: a union of shapes breaks the generated `interface Env`. If the config fails to load, look for a value import of a `@repo/*` package other than `@repo/enums-common`, or an extensionless relative import added inside `@repo/enums-common`: Node loads the file natively and adds no extensions.

## Local data

- `--local` runs a command against a short-lived Miniflare instead of the account: KV keys (`cf kv keys …`), D1 (`cf d1 raw`, `cf d1 migrations list|apply`), R2 objects (`cf r2 objects …`). A command with no local equivalent errors instead of falling through to the account.
- `--local` defaults to `state/` under cf's global config directory, which is neither the app's dev state nor writable in the Claude Code sandbox. To use what `cf dev` wrote, run it from the app with `--persist-to .cloudflare/state`: `pnpm --filter=<app> exec cf kv keys list … --local --persist-to .cloudflare/state`.
- Resource commands take API IDs (a D1 database ID, not its name).
- While `cf dev` runs, the Local Explorer API answers on `http://localhost:8700/cdn-cgi/local/explorer/api` (`:5174` for front-app); trace and log queries: skill `run-app`.

## Output and exit codes

- Results are JSON on stdout, except binary and text responses (an R2 object body), which are written raw; progress, messages, and errors go to stderr. Parse stdout only, under `NO_COLOR=1`: cf colors its JSON when `FORCE_COLOR` is set, even on a pipe, which is why `deploy-previews.sh` runs `cf previews deploy` that way.
- In a non-interactive session a destructive command without `--force` prints `Aborted.` and exits 0: a zero exit does not mean anything was deleted.
- `cf workers versions create` prints no JSON yet (upstream bug `versions-upload-no-json-output`): with `WRANGLER_OUTPUT_FILE_PATH=<file>` it appends an ND-JSON `version-upload` record (`worker_name`, `version_id`, `preview_url`) there, which CD reads. There is no `--strict` flag because cf always uploads strict: in CI a conflict (dashboard edits, remote-secret overrides) aborts with exit 1 and `version_id: null`, and the error's hint to remove `--strict` does not apply.
- `cf deploy --prebuilt --mode production --dry-run` needs no token and no account ID: it validates Build Output and prints the bindings it would deploy.

## Never, as an agent

- Deploy, upload, promote, roll back, or preview: `pnpm run deploy`, `pnpm run upload`, `pnpm preview:*`, `cf deploy`, `cf workers versions create`, `cf workers deployments create`, `cf workers triggers deploy`, `cf previews deploy`. CD and the Previews workflow own them (rules `ops/cd`, `ops/previews`, `ops/release`); hand the exact command to the user.
- Log in: `cf auth login` (root script `login`) is the user's. cf reads `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` like Wrangler did; `CF_ACCOUNT_ID` is a deprecated alias.
- Run `cf dev`, `cf build`, `cf deploy`, or `cf init` in a directory without `cloudflare.config.ts` (autoconfiguration rewrites the project), or `cf migrate` anywhere (it rewrites a Wrangler project's files for cf). A new app copies an existing app's `cloudflare.config.ts` and `vite.config.ts`, then is adapted by hand.
- Change account state without `--local` - a KV, D1, or R2 write or delete, `cf workers secrets update|delete|bulk`, `cf workers delete` - unless the user asked for that exact operation and its `--dry-run` matched.

For the hand-off: promote or roll back with `pnpm --filter=<app> exec cf workers deployments create --worker <app>-production --strategy percentage --versions '[{"version_id":"<id>","percentage":100}]'` (earlier ids: `cf workers deployments list --worker <app>-production`); after the first production deploy, or when a Preview has no URL, `pnpm --filter=<app> exec cf workers triggers deploy --mode production` applies `previewUrls` and workers.dev once per app.

## Secrets

- Local values come from a gitignored Worker `.env` or the shell (`SENTRY_DSN=… pnpm dev`; turbo passes `SENTRY_DSN` to `worker-api#dev`), never a `.dev.vars`; unset means Sentry is off in dev. The Vite plugin aborts on an env file it cannot read and the agent sandbox denies `**/.env`, so the agent session sets `SKIP_ENV_FILES=1` and sandboxed runs skip the `.env` (rule `backend/workers-config`).
- Deployed secrets are declared with `bindings.secret()`; the `test` mode and Previews use `bindings.text("")` for `SENTRY_DSN`. Values go up with `--secrets-file <path>` on `cf deploy` / `cf workers versions create` (a file outside the checkout, e.g. under `$TMPDIR`, deleted after use), or one at a time with `wrangler secret put` (below) - users and CD only.
- Every `apps/front-app/.env*` file holds public `VITE_*` values only, and the sandbox reads them through the `**/apps/front-app/.env*` allow, because `build` hashes them as inputs.

## Still Wrangler

The root devDependency `wrangler` stays for what cf lacks. Run it as `pnpm exec wrangler …`; each row needs the user's Wrangler credentials (`pnpm exec wrangler login` or exported `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`; `cf auth login` does not cover Wrangler), so hand it over:

| Task | Command |
|------|---------|
| Tail production logs | `pnpm exec wrangler tail <app>-production` |
| Put one deployed secret | `pnpm exec wrangler secret put <NAME> --name <app>-production` |
| Delete a Preview (no config file needed) | `pnpm exec wrangler preview delete --worker-name <app>-production --name <preview> -y` |
| Put a Preview secret | `pnpm exec wrangler preview secret put …` (rule `ops/previews`) |

`hono request` no longer sees the bindings: it loads them through Wrangler's `getPlatformProxy`, and `--runtime workerd` needs a Wrangler config. Probe the running `cf dev` server instead; `pnpm --filter=worker-api run routes` (`hono routes`) still works.

## Sandbox

- `cf dev` and `--local` commands start workerd, so they need `sandbox.network.allowLocalBinding` and a sandbox-writable `CLOUDFLARE_REGISTRY_PATH`: cf keeps its dev registry there and sets `WRANGLER_REGISTRY_PATH` and `MINIFLARE_REGISTRY_PATH` to the same path for its children, so an inherited `WRANGLER_REGISTRY_PATH` does not reach them. The `WRANGLER_*` paths stay for the Workers Vitest pool and the Wrangler-only commands.
- Telemetry: cf checks `DO_NOT_TRACK`, then `CF_SEND_TELEMETRY`, then `WRANGLER_SEND_METRICS`. CI sets `DO_NOT_TRACK=1` and `CF_SEND_TELEMETRY=false`; agents run with `CF_SEND_TELEMETRY=false` from the settings `env`. Humans turn it off once per machine with `pnpm exec cf cli telemetry disable`, which replaces the `send_metrics: false` that left with `wrangler.jsonc`. `pnpm exec cf cli telemetry status` names the source.

## Wrangler habits

| Habit | Now |
|-------|-----|
| `wrangler.jsonc`, `--env <name>` | `cloudflare.config.ts`, `--mode <name>` |
| `wrangler dev` / `deploy` / `types` | `cf dev` / `cf deploy --prebuilt --mode production` / `cf workers types`, through the app scripts |
| Committed `worker-configuration.d.ts`, `types:check` | Gitignored `.cloudflare/types/index.d.ts`, regenerated before `check-types`; no check task |
| `dist/` | `.cloudflare/output/v0/` |
| `wrangler check startup` | `cf workers check` |
| `wrangler versions deploy`, `wrangler rollback` | `cf workers deployments create` with the version id |
| Waiting for "Ready on" | Vite's `Local:` banner |

## Docs

The installed `node_modules/cf/README.md` and `--help` match the pinned beta; the pages below may lag it. Append `index.md` to a page URL for Markdown; where a page and the installed `--help` disagree, the help wins. Until cloudflare/cloudflare-docs#33735 merges, the `/cf/` pages return 404 - read the same paths on `https://docs-cloudflare-cli.preview.developers.cloudflare.com`.

- Overview: https://developers.cloudflare.com/cf/
- From Wrangler: https://developers.cloudflare.com/cf/wrangler/migrate/ and the command mapping, https://developers.cloudflare.com/cf/wrangler/reference/
- Projects and `cloudflare.config.ts`: https://developers.cloudflare.com/cf/projects/ and https://developers.cloudflare.com/cf/projects/cloudflare-config/
- CI and agents: https://developers.cloudflare.com/cf/ci/ and https://developers.cloudflare.com/cf/agents/
- Build Output: https://developers.cloudflare.com/workers/build-output/
