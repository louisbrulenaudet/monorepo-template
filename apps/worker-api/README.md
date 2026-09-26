# worker-api

Public HTTP gateway for the monorepo, built with Hono on Cloudflare Workers. `front-app` and external clients call it over HTTP; business Workers join later through service-binding RPC. It validates every input against the shared Zod schemas in `@repo/dtos-common/api`, applies CORS and security middleware, and returns typed JSON.

## Run it

```sh
pnpm turbo run dev --filter=worker-api   # Wrangler on http://localhost:8700
curl -s http://localhost:8700/api/v1/health
```

```json
{ "status": "ok", "version": "0.0.0" }
```

Run commands from the repository root, or with `pnpm -w` from this directory: raw package scripts bypass Turbo's dependency graph. Test, typegen, deploy, and Hono CLI commands are listed in [AGENTS.md](AGENTS.md).

## What ships today

- `GET /api/v1/health` returns the release semver in `version`; the `X-Worker-Version-Id` header carries the opaque Wrangler version id.
- `POST /api/v1/echo` is the worked `zValidator` example ([`src/routes/echo.ts`](src/routes/echo.ts)): it validates the JSON body and the `?uppercase=true` query flag, and answers a validation failure with `{ error, requestId, issues }`. It is not mounted in production (404 there), because it reflects caller input on an unauthenticated route with no rate limit.
- Every response carries `X-Request-Id`, and every error body is `{ error, requestId }`, so a caller can quote the id of a failure and you can find it in the logs.

Not wired yet: auth or session middleware, service bindings to `worker-*`, and rate limiting (a Workers Rate Limiting binding or WAF rules), which must land before any public write ships.

Agent and contributor detail: [AGENTS.md](AGENTS.md).
