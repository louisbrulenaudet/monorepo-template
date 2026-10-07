---
name: run-app
description: "USE WHEN: running, smoke-testing, or visually checking the apps - starting the worker-api / front-app dev servers, probing health, CORS, the 404 envelope and the SPA shell, rendering the SPA in a headless browser, reading local request traces, or probing a Worker Preview URL the user deployed. This is the project skill the built-in /run looks for. DO NOT USE WHEN: running unit tests (`pnpm turbo run test --filter=<ws>`) or the CI gate (`pnpm run ci`)."
---

# Run and verify the apps

Run everything from the repository root. The smoke script discovers apps from `apps/*/package.json` (`monorepo.role`, `monorepo.healthPath`, `monorepo.devPort`), so a new app is covered without editing it.

## Local loop

1. Start each dev server as its own **background** Bash task (never a bare `&`). Both scripts are `cf dev`, which runs Vite:
   - `pnpm --filter=worker-api dev` - ready when Vite prints `Local:   http://localhost:8700/`
   - `pnpm --filter=front-app dev` - ready when Vite prints `Local:   http://localhost:5174/`

   Wait with one capped `until grep -q 'localhost:<port>' …; do sleep 0.5; done` on each task's output file. If the SessionStart context reported a port as already listening, reuse that server instead of starting a second one.
2. `node .github/actions/lib/smoke.mjs --traces` - every line must read `ok`. `--traces` prints the latest requests the gateway captured, newest first.
3. Browser check (the SPA is only verified once it has rendered):

   ```bash
   pnpm exec playwright-cli open http://localhost:5174
   pnpm exec playwright-cli snapshot        # Stack check card: status, version, latency, request id
   pnpm exec playwright-cli console error   # expect no errors
   pnpm exec playwright-cli requests        # /api/v1/health returned 200; an earlier [FAILED] net::ERR_ABORTED is StrictMode cancelling the first signal-bound fetch
   pnpm exec playwright-cli close
   ```

   Always type the `pnpm exec playwright-cli` prefix. The binary is a repo devDependency and is not on `PATH`, and that exact prefix is what `sandbox.excludedCommands` lets out of the sandbox: Chrome cannot start inside it. Never `cd`, pipe, or redirect it, and chain steps with plain `&&` only: any other form runs it sandboxed, where it fails with `EPERM` on `~/Library/Caches/ms-playwright/daemon` or loses the session; read `--raw` / `--json` output from stdout instead. The upstream `playwright-cli` skill documents every other command - apply the same prefix to its examples. If the browser is missing on a new machine: `pnpm exec playwright-cli install-browser chromium`.
4. Stop both background tasks when done.

Inside the Claude Code sandbox this loop needs `sandbox.network.allowLocalBinding` and two settings `env` entries: a sandbox-writable `CLOUDFLARE_REGISTRY_PATH` (cf's dev registry, which it also hands to Wrangler and Miniflare in place of any `WRANGLER_REGISTRY_PATH`; the default lives in cf's global config directory, outside the sandbox's writable paths) and `NODE_USE_ENV_PROXY=1` (routes Node's `fetch` through the sandbox proxy, so non-localhost probes such as a Preview URL resolve). `cf dev` aborts on an env file the sandbox will not let it read, so the settings `env` entry `SKIP_ENV_FILES=1` makes a Worker's `vite.config.ts` skip its `.env` (gitignored local secrets): the sandboxed loop starts without those values, and Sentry stays off. Where a user-level `Bash(curl *)` deny applies, probe with `node -e 'fetch(process.argv[1]).then(async (r) => { console.log(r.status, await r.text()); process.exitCode = r.ok ? 0 : 1; })' <url>`.

## Inspecting the SPA (state, source, devtools)

The TanStack and Vite devtools panels are for humans. An agent reads the same state through `eval` in the open session:

```bash
pnpm exec playwright-cli eval "() => { const s = window.__TSR_ROUTER__.state; return { status: s.status, href: s.location.href, matches: s.matches.map((m) => ({ routeId: m.routeId, status: m.status })) }; }"
pnpm exec playwright-cli eval "() => window.__TSR_ROUTER__.options.context.queryClient.getQueryCache().getAll().map((q) => ({ key: q.queryKey, status: q.state.status, fetchStatus: q.state.fetchStatus, error: q.state.error ? String(q.state.error) : null }))"
pnpm exec playwright-cli eval "(el) => el.closest('[data-tsd-source]')?.getAttribute('data-tsd-source')" <ref>
```

- `@tanstack/router-core` sets `window.__TSR_ROUTER__` in every browser build, and the query client rides in its `options.context`. Upstream does not document the global: after a router upgrade, re-check it with `grep -rn "__TSR_ROUTER__ = this" node_modules/.pnpm/@tanstack+router-core@*/node_modules/@tanstack/router-core/dist/esm/router.js`.
- In dev, `data-tsd-source="<file>:<line>:<col>"` (`@tanstack/devtools-vite` `injectSource`) maps a snapshot ref to the JSX that rendered it; on a primitive that spreads its props it names the call site.
- Browser warnings and errors land in the front-app dev task output (`server.forwardConsole`), and each `console.error` carries a `Go to Source` link (`enhancedLogs`).
- Failure path: `pnpm exec playwright-cli route "**/api/v1/health" --status=503 && pnpm exec playwright-cli reload`, then `unroute`.
- Load metrics: `eval` a buffered `PerformanceObserver` for `largest-contentful-paint` and `layout-shift` (never `getEntriesByType('layout-shift')`, which returns nothing); CDP metrics through `run-code "async (page) => { const c = await page.context().newCDPSession(page); await c.send('Performance.enable'); return (await c.send('Performance.getMetrics')).metrics; }"`. Dev serves unbundled ESM, so compare dev with dev only.
- Emulation and evidence: `set-color-scheme dark`, `set-reduced-motion reduce`, `set-forced-colors active`, `resize 320 640`, `screenshot --filename=<absolute path>`, `tracing-start` / `tracing-stop`.
- Rolldown build data comes only from the analyze build (`VITE_API_BASE_URL=<origin> pnpm --filter=front-app run analyze`), written to `apps/front-app/node_modules/.rolldown/<sid>/logs.json` as NDJSON events (`ChunkGraphReady`, `AssetsReady`, `PackageGraphReady`); chunk sizes: the `bundle-analyzer` agent.
- Never open the TanStack inspector or `GET /__tsd/open-source`: both launch the editor.

## Debugging a failing request locally

The Local Explorer that `cf dev` serves exposes read-only SQL over the traces and console logs it captured:

- `POST http://localhost:8700/cdn-cgi/local/explorer/api/local/observability/query` with `{"sql": "SELECT … FROM spans | logs …"}`. `spans` has `trace_id`, `span_id`, `parent_id`, `name`, `outcome`, `error`, `duration_ms`, `start_ms`. `logs` has `span_id`, `seq`, `level`, and `message`, where seq 0 is the request line.
- `GET http://localhost:8700/cdn-cgi/local/explorer/api/local/workers` - the bindings the local Worker sees.

The same API is served on `:5174` for front-app's assets Worker.

## Without a dev server

There is no bindings-aware smoke without `cf dev`: `hono request` loads bindings through Wrangler's `getPlatformProxy`, and `--runtime workerd` needs a Wrangler config the apps no longer have, so neither sees the gateway's bindings. Start the dev server and probe it instead. `pnpm --filter=worker-api run routes` (`hono routes`) still lists the routes offline.

## Worker Preview

Agents never deploy. The user runs `pnpm preview:deploy` and pastes the printed URLs, or you read the Previews comment on the PR (`gh pr view <n> --comments`). Contract: `.claude/rules/ops/previews.md`.

1. `node .github/actions/lib/smoke.mjs --url worker-api=<gateway Preview URL> --url front-app=<front Preview URL>`. With any `--url`, only the named apps are probed, each retried for ~25 s until it serves; `deploy-previews.sh` and CD run this same script. If Cloudflare Access protects the URL, the script sends `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` from the environment.
2. Run the same browser loop against the front Preview URL.
3. Logs and traces come from the `cloudflare-observability` MCP server, filtered by the `X-Request-Id` the smoke printed. The Local Explorer and `pnpm exec wrangler tail` do not reach Previews.
