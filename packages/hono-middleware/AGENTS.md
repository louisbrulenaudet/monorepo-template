# @repo/hono-middleware Agent Instructions

## Overview

Hono middlewares and handlers shared by the public-HTTP Workers (`worker-api` today; `webhook-*` and `mcp-*` when they land). **One named export per middleware, no preset:** each app imports the pieces it needs and registers them itself, in the order set by rule `backend/hono-gateway`, so the chain stays readable in its own `index.ts`. Browser-only concerns (CORS, the Origin / CSRF gate) stay in `worker-api`, the only Hono app browsers reach.

Tag `framework` (see rule `core/boundaries`): it may depend on `lib`, `contracts-base` and `config`, and only apps may depend on it.

## Structure

```
packages/hono-middleware/
├── src/
│   ├── env.ts                 # BaseBindings, HonoEnv<Bindings> - the app's bindings contract
│   ├── request-id.ts          # requestIdMiddleware - mints one UUID per request, never reads the inbound header
│   ├── sentry.ts              # sentryMiddleware(app, { release }) - locked-down dataCollection
│   ├── method-not-allowed.ts  # jsonMethodNotAllowed(app)
│   ├── secure-headers.ts      # apiSecureHeaders
│   ├── errors.ts              # notFoundHandler, errorHandler - the only { error, requestId } builder
│   ├── validator.ts           # validator(target, schema) - zValidator that throws into errorHandler
│   └── index.ts               # Named re-exports only
└── turbo.json                 # tags: ["framework"]
```

## Contracts

- **Bindings:** a consuming app declares `export type AppEnv = HonoEnv<Env>`. `Bindings extends BaseBindings` fails `tsc` when `wrangler.jsonc` lacks `SENTRY_DSN` in `secrets.required` or sets an `ENVIRONMENT` outside `AppEnvironment`. Add a key to `BaseBindings` only when a middleware here reads it.
- **Errors:** reject by throwing `HTTPException(status, { message })`; `errorHandler` renders `{ error, requestId }`, plus `issues` when `cause` is a Zod error, and logs every 5xx - unhandled or a thrown `HTTPException` - as one structured object keyed by `requestId`; a 4xx is never logged. `jsonMethodNotAllowed` builds its body directly because the `Allow` header would not survive a throw.
- **Sentry:** `dataCollection` and the console-breadcrumb drop keep sensitive data out of a third party; never loosen them per app. The sampler mirrors `head_sampling_rate` in every consuming app's `wrangler.jsonc` (1 in `dev` / `preview`, 0.01 elsewhere).
- **Apps may not bypass the package:** `.oxlintrc.json` restricts `@hono/zod-validator` and `@sentry/hono/cloudflare` imports under `apps/{worker,webhook,mcp,queue}-*`.
- **Handlers are generic** (`<E extends { Variables: RequestIdVariables }>`): Hono's `Context` is invariant in its Env, so a handler typed on a narrow Env is not assignable to `app.onError` / `app.notFound`.

## Adding a middleware

1. It must be needed by a second Hono app, or be security configuration that must not drift (rule `quality/simplicity`: promote on the second consumer).
2. One file `src/<name>.ts`, kebab-case; pass a **named function expression** to `createMiddleware` so `hono routes --verbose` names it.
3. Type it on the narrowest Env it reads (`createMiddleware<{ Variables: RequestIdVariables }>`), or take the app as `Hono<HonoEnv<Bindings>>` when it needs one.
4. Named-export it from `src/index.ts` and register it in each consumer's `index.ts`; update the order in rule `backend/hono-gateway` (both trees).

## Tests

None here yet: `apps/worker-api/tests/` owns these contracts through the Worker `fetch` entry (envelopes, `X-Request-Id`, CSP, 405). When a second app consumes the package, move those cases here with a Node Vitest config (`defineNodeConfig` from `@repo/vitest-config`) instead of repeating them per app.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm -w turbo run check-types --filter=@repo/hono-middleware` | Type-check |
| `pnpm -w turbo run test --filter=worker-api` | The suites that own this package's behavior today |
