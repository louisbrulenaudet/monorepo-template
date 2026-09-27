---
name: run-app
description: "USE WHEN: running, smoke-testing, or visually checking the apps - starting the worker-api / front-app dev servers, probing health, CORS, the 404 envelope and the SPA shell, rendering the SPA in a headless browser, reading local request traces, or probing a Worker Preview URL the user deployed. This is the project skill the built-in /run looks for. DO NOT USE WHEN: running unit tests (`pnpm turbo run test --filter=<ws>`) or the CI gate (`pnpm run ci`)."
---

# Run and verify the apps

Run everything from the repository root. The smoke script discovers apps from `apps/*/package.json` (`monorepo.role`, `monorepo.healthPath`, `monorepo.devPort`), so a new app is covered without editing it.

## Local loop

1. Start each dev server as its own **background** Bash task (never a bare `&`):
   - `pnpm --filter=worker-api dev` - ready when its output shows `Ready on http://localhost:8700`
   - `pnpm --filter=front-app dev` - ready when its output shows `Local:`

   Wait with one capped `until grep -q …; do sleep 0.5; done` on each task's output file. If the SessionStart context reported a port as already listening, reuse that server instead of starting a second one.
2. `node .agents/skills/run-app/scripts/smoke.mjs --traces` - every line must read `ok`. `--traces` prints the latest requests the gateway captured, newest first.
3. Browser check (the SPA is only verified once it has rendered):

   ```bash
   pnpm exec playwright-cli open http://localhost:5174
   pnpm exec playwright-cli snapshot        # API health indicator + version footer rendered
   pnpm exec playwright-cli console error   # expect no errors
   pnpm exec playwright-cli requests        # the /api/v1/health call returned 200
   pnpm exec playwright-cli close
   ```

   Always type the `pnpm exec playwright-cli` prefix. The binary is a repo devDependency and is not on `PATH`, and that exact prefix is what `sandbox.excludedCommands` lets out of the sandbox: Chrome cannot start inside it. The upstream `playwright-cli` skill documents every other command - apply the same prefix to its examples. If the browser is missing on a new machine: `pnpm exec playwright-cli install-browser chromium`.
4. Stop both background tasks when done.

Inside the Claude Code sandbox this loop works because of `sandbox.network.allowLocalBinding` and two settings `env` entries: `WRANGLER_REGISTRY_PATH` (without it `wrangler dev` dies on EPERM in `~/.wrangler/registry`) and `NODE_USE_ENV_PROXY=1` (routes Node's `fetch` through the sandbox proxy, so non-localhost probes such as a Preview URL resolve). Where a user-level `Bash(curl *)` deny applies, probe with `node -e 'fetch(process.argv[1]).then(async (r) => { console.log(r.status, await r.text()); process.exitCode = r.ok ? 0 : 1; })' <url>`.

## Debugging a failing request locally

Wrangler's Local Explorer exposes read-only SQL over the traces and console logs it captured:

- `POST http://localhost:8700/cdn-cgi/local/explorer/api/local/observability/query` with `{"sql": "SELECT … FROM spans | logs …"}`. `spans` has `trace_id`, `span_id`, `parent_id`, `name`, `outcome`, `error`, `duration_ms`, `start_ms`. `logs` has `span_id`, `seq`, `level`, and `message`, where seq 0 is the request line.
- `GET http://localhost:8700/cdn-cgi/local/explorer/api/local/workers` - the bindings the local Worker sees.

The same API is served on `:5174` for front-app's assets Worker.

## No-server smoke

`pnpm --filter=worker-api exec hono request /api/v1/health --runtime workerd` works only while **no** worker-api dev server is running. workerd binds `dev.port` 8700, and on `Address already in use` it hangs instead of exiting.

## Worker Preview

Agents never deploy. The user runs `pnpm preview:deploy` and pastes the printed URLs, or you read the Previews comment on the PR (`gh pr view <n> --comments`). Contract: `.claude/rules/ops/previews.md`.

1. `node .agents/skills/run-app/scripts/smoke.mjs --url worker-api=<gateway Preview URL> --url front-app=<front Preview URL>`. With any `--url`, only the named apps are probed. If Cloudflare Access protects the URL, the script sends `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` from the environment, as `deploy-previews.sh` does.
2. Run the same browser loop against the front Preview URL.
3. Logs and traces come from the `cloudflare-observability` MCP server, filtered by the `X-Request-Id` the smoke printed. The Local Explorer and `wrangler tail` do not reach Previews.
