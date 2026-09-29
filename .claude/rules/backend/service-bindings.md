---
paths:
  - "**/cloudflare.config.ts"
  - "apps/worker-*/src/**/*.ts"
  - "apps/queue-*/src/**/*.ts"
  - "apps/webhook-*/src/**/*.ts"
  - "apps/mcp-*/src/**/*.ts"
---

# Service Bindings (Worker-to-Worker RPC)

## Caller

- Bind by Worker-name string in the caller's `env`: `FOO: bindings.worker({ worker: "worker-foo-production" })`, the name taken from the `Deployment` table so each mode binds the callee's matching Worker. `exportName` selects a named `WorkerEntrypoint` export (default: the default export) and is required when binding a named class.
- A string reference types the binding as a plain `Fetcher`, without RPC method types. The cf docs' typed form passes the callee's `defineWorker` config, which imports another app's `cloudflare.config.ts` and fails `pnpm boundaries` ([boundaries.md](../core/boundaries.md)). Typed cross-Worker RPC is deferred to the first `worker-*`; decide it in that change. Never augment `Env` by hand to type a binding.
- Call `env.BINDING.method()` from a route handler or service module, and `await` every call: RPC client methods are always async. Never `env.BINDING.fetch()` when RPC methods are the goal; the exception is a cacheable hot read path ([workers-cache.md](workers-cache.md)).
- Payload schemas live in `@repo/dtos-common/rpc` ([contracts.md](../contracts/contracts.md)).
- Cloudflare propagates no custom id across a binding: pass `requestId` as an explicit RPC argument (or queue message field) and log it the same way; traces nest on their own.

## Callee

- Extend `WorkerEntrypoint` from `cloudflare:workers` and add public methods - those are what callers invoke. RPC methods cannot live on a plain `export default { fetch }` handler.
- Default-export the entrypoint class, or export a named class and set `exportName` on the caller.
- Bindings are `this.env` (a class property of `WorkerEntrypoint`: `this.env.GREETING`, `this.env.D1`); RPC methods take only their own arguments, no `request` / `env` parameters.

## After a binding change

1. Callee: exported `WorkerEntrypoint` class with public RPC methods.
2. Caller: `bindings.worker()` in `cloudflare.config.ts`, named per mode.
3. Shared payload schemas in `dtos-common/rpc` if needed.
4. `pnpm types`, then `pnpm check-types`.
5. The first `worker-*` binding also adds the `createTestHarness` Node suite (checklist in `packages/vitest-config/AGENTS.md`), keeping the pool suites.
