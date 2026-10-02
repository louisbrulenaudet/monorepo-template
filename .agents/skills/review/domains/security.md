---
id: security
summary: trust boundaries, CORS/CSRF, validation, secrets and sensitive-data leakage, headers, RPC/webhook/queue/MCP surfaces, SPA client-side, supply chain
model: sonnet
---

# Security

Can an untrusted caller cross a trust boundary it should not - forge a request, reach a privileged surface, read another principal's data, extract a secret, or spend resources on someone else's account? This domain owns security while `/review` runs; it is a focused review, not the full `security-audit` workflow.

## Ground truth

- Guardrails [core/guardrails](../../../../.claude/rules/core/guardrails.md): Sensitive data, Least privilege for model-facing surfaces, Respect the boundaries.
- Rules: [backend/hono-gateway](../../../../.claude/rules/backend/hono-gateway.md) (Middleware order, Errors, Validation, Observability), [backend/workers-config](../../../../.claude/rules/backend/workers-config.md) (Secrets vs vars, Preview branch), [backend/service-bindings](../../../../.claude/rules/backend/service-bindings.md), [ops/previews](../../../../.claude/rules/ops/previews.md), [frontend/react](../../../../.claude/rules/frontend/react.md) (client env), [frontend/vite-config](../../../../.claude/rules/frontend/vite-config.md) (`_headers`, `clientAuth`).
- Cloudflare `security-audit` companions - read the **Core discipline** and **Validation** sections of each that applies; never edit them (vendored, hash-pinned in `skills-lock.json`):
  - always: [WEB-PROTOCOL-AND-AUTH.md](../../security-audit/WEB-PROTOCOL-AND-AUTH.md)
  - `front-*` in scope: [CLIENT-SIDE.md](../../security-audit/CLIENT-SIDE.md)
  - service-binding RPC, a queue consumer, or `webhook-*`: [PROTOCOLS-RPC-AND-MESSAGING.md](../../security-audit/PROTOCOLS-RPC-AND-MESSAGING.md)
  - `mcp-*` or any model-facing tool: [AI-AND-LLM.md](../../security-audit/AI-AND-LLM.md)
  - dependencies: [SUPPLY-CHAIN-AND-RELEASE.md](../../security-audit/SUPPLY-CHAIN-AND-RELEASE.md)
- External: [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/), [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [Static assets headers](https://developers.cloudflare.com/workers/static-assets/headers/).

Escalate - one line in the reply, not a finding - to `/security-audit` when the user asked for an audit or pen test, or when a Critical spans several trust boundaries and needs exploit-path validation.

## Scope

`apps/*/src/**` (every public entry point: `fetch`, `WorkerEntrypoint` methods, `queue()`, webhook and MCP handlers), `packages/hono-middleware/src/**`, `packages/dtos-common/src/**`, every `cloudflare.config.ts` (security-relevant bindings and vars), `apps/front-*/vite.config.ts` (`_headers` CSP/HSTS), `apps/front-*/src/**`, root `package.json` and `pnpm-lock.yaml` (audit). A path, workspace, or `diff` focus narrows to it; with `diff`, still trace each changed entry point to its controls.

## Probe

`pnpm run audit` (never bare `pnpm audit`, which drops `--audit-level=high`), `pnpm --filter=worker-api run routes`, `git log -S '<string>' --oneline` for a secret-shaped literal's history. When dev servers are **already** running (never start them): `node .github/actions/lib/smoke.mjs` - foreign-origin CORS refusal, `X-Request-Id`, JSON 404 envelope.

## Axes

- **Entry points and parallel paths**: list every public route and RPC method; the effective policy of an operation is its weakest path - sub-apps mounted outside `/api/*`, method-not-allowed handling, the health route, a second Worker exposing the same operation; business `worker-*` has no public HTTP.
- **CORS and CSRF**: allowlist read per request from `CORS_ORIGINS`; empty is permissive in `dev` only and 503 elsewhere; the prefix wildcard honored only in `PREVIEW`; a **reflected or loosely matched origin combined with credentials** is the real bug - a plain `*` without credentials is Hardening; the origin / `Sec-Fetch-Site` gate covers unsafe methods with any content type, never Hono `csrf()` alone; name the ambient credential before calling something CSRF.
- **Validation and resource caps**: every input goes through `validator(target, Schema)` from `@repo/hono-middleware`; `bodyLimit` runs before parsing; schemas bound lengths, array sizes, and pagination; one unknown-keys policy per file and no mass assignment (a handler spreading a parsed body into a write); no regex with catastrophic backtracking on untrusted input; never `z.compile()`.
- **Authorization** (once auth exists): object-level checks on every `:id` route (BOLA); a caller-supplied tenant or user field is re-checked, never trusted; function-level checks on admin-shaped operations.
- **Service-binding RPC**: every public `WorkerEntrypoint` method authenticates or authorizes its caller - "internal" is not authentication, and Hono middleware on `fetch` does not cover RPC methods; identity fields in RPC arguments are caller-chosen until verified.
- **Webhooks**: signature verified over the **raw** body, bound to timestamp and event type, with a replay window and a constant-time compare (`crypto.subtle.timingSafeEqual`), all before parsing or any side effect; the secret is a `bindings.secret()`.
- **Queues**: at-least-once delivery handled by an idempotency key checked before side effects; poison messages bounded (retries, DLQ); nothing sensitive lands in a DLQ or retry payload without a retention rule.
- **MCP and model-facing tools**: read/query-oriented only (guardrails); each tool handler re-checks the requester's permission on the named resource (confused deputy); approval binds the full argument object; the Zod schema and the handler agree; tool descriptions and metadata are never policy; per-request budget on loops and paid calls; document text is untrusted input, never instructions.
- **Headers and edge**: `apiSecureHeaders` on the gateway per rule `backend/hono-gateway`; the SPA's CSP / HSTS come from the generated `_headers`, which covers static assets only; `Server-Timing` dev-only; rate limits and URL building use `CF-Connecting-IP` and configured origins, never `Host` / `X-Forwarded-*`; a `ratelimit` binding on abuse-prone routes; a missing header with no exploit path is Hardening.
- **Secrets and sensitive data**: no secret in code, `bindings.text()`, client bundle, logs, error bodies, or URLs; no user or tenant identifier in logs, trace attributes, cache keys, or error bodies; the request id is minted per request, never read from inbound headers; Sentry `dataCollection` stays locked down and console breadcrumbs dropped; validation failures are never logged; error messages stay generic with `requestId`; random tokens from Web Crypto, never `Math.random()`.
- **Previews and dev surfaces**: Previews are public until Cloudflare Access guards the `front-app` ones (Needs validation for the Access policy; when Access fronts a Worker, it validates `Cf-Access-Jwt-Assertion`); the echo route's production gate; `clientAuth: false` never set on Vite devtools; no debug, env-dump, or test-only route reachable in a deployed mode.
- **SPA client-side**: no `dangerouslySetInnerHTML` on untrusted data; `redirect` / `next` search params cannot produce `javascript:` or off-site navigation; `postMessage` listeners check an exact origin; `VITE_*` values are public by construction; auth tokens and the query cache are cleared on logout once auth exists.
- **Supply chain**: `pnpm run audit` high/critical findings that are **reachable** from shipped code; a CVE with no reachable path is Hardening; lockfile integrity; the `pnpm-workspace.yaml` supply-chain policy (`allowBuilds` + `strictDepBuilds`, `minimumReleaseAge`, `trustPolicy`, `blockExoticSubdeps`) is not loosened, and a new `allowBuilds` entry or release-age exclusion has a reason.
- **Obvious things**: security `TODO` / `FIXME`, `eval` / `new Function`, commented-out checks, a secret-shaped literal in history.

## Critical when

A control defeated (CORS with credentials reflecting any origin, CSRF gate bypassable, validation skipped on a route); an RPC method, webhook, or MCP tool acting without verifying its caller; a secret or sensitive identifier in the bundle, a log, an error body, or git; a mode or empty stand-in that disables a check; an unbounded pre-auth input; a reachable high/critical dependency vulnerability.

## Overlaps

`bindings.secret()` declaration and mode config belong to `configuration` (this domain owns **leakage**); `Cache-Control` and capacity to `performance`; workflow and CI-secret hardening to `ci`; trust-boundary mapping between components to `architecture` (this domain owns the controls on each surface); security regression tests to `tests`; Hono / Sentry / Zod API currency to `review-stack hono` / `sentry` / `zod`. This domain owns error envelopes, CSP/HSTS, and dependency vulnerabilities.

## Accepted

- Middleware order, CSP `default-src 'none'` on JSON, CORP `same-origin`, dev-only permissive CORS: rule [backend/hono-gateway](../../../../.claude/rules/backend/hono-gateway.md).
- Preview CORS wildcard honored only under `PREVIEW`: rule [backend/workers-config](../../../../.claude/rules/backend/workers-config.md).
