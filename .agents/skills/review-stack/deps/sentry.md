---
id: sentry
summary: SDK init in front-app and worker-api, sampling, data scrubbing, releases, source maps
families: [observability]
packages: [@sentry/react, @sentry/cloudflare, @sentry/hono, @sentry/vite-plugin, @sentry/cli]
paths: [apps/front-*/src/config/sentry*.ts, apps/front-*/src/config/instrument.ts, apps/front-*/src/main.tsx, apps/front-*/vite.config.ts, apps/front-*/turbo.json, apps/worker-api/src/index.ts, apps/*/cloudflare.config.ts, apps/*/vitest.config.*, apps/*/package.json, .github/workflows/cd.yml, .github/workflows/preview.yml, .claude/rules/backend/hono-gateway.md, .claude/rules/ops/release.md]
---

# Sentry

Sentry error tracking and tracing across `front-app` (`@sentry/react`) and `worker-api` (`@sentry/hono` on `@sentry/cloudflare`): SDK initialization, sampling, sensitive-data scrubbing, release naming, and the source-map pipeline.

## Ground truth

- **Stale-knowledge risk**: the JavaScript SDK ships majors often and renames options between them (`dataCollection`, tracing integrations, Cloudflare/Hono wrappers are recent).
- **Collector**: "Sentry JavaScript SDK" at the installed major - `init` options (`dataCollection`, `tracesSampler`/`tracesSampleRate`, `tracePropagationTargets`, `beforeBreadcrumb`/`beforeSend`), React 19 root error hooks (`reactErrorHandler`), `tanstackRouterBrowserTracingIntegration`, lazy `addIntegration`; `@sentry/cloudflare` + `@sentry/hono` middleware; `@sentry/vite-plugin` debug IDs; `sentry-cli` releases and `sourcemaps upload`.
- **Web fallback**: `docs.sentry.io` (JavaScript platforms: React, Cloudflare, Hono; sampling; data scrubbing; source maps), `github.com/getsentry/sentry-javascript` (`CHANGELOG.md`, `MIGRATION.md`).
- **Version currency**: the `@sentry/*` catalog entries in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); `@sentry/hono` peers on the exact same `@sentry/cloudflare` version, so the three SDK packages move together - check that pins agree.

## Scope

- [apps/front-app/src/config/sentry.ts](../../../../apps/front-app/src/config/sentry.ts), [instrument.ts](../../../../apps/front-app/src/config/instrument.ts), [sentry-tracing.ts](../../../../apps/front-app/src/config/sentry-tracing.ts); first-import position in [main.tsx](../../../../apps/front-app/src/main.tsx); `captureClientError` call sites (e.g. `query-client.ts`)
- [apps/front-app/vite.config.ts](../../../../apps/front-app/vite.config.ts) - `sentryVitePlugin`, the debug-ID source-map plugin, `__SENTRY_DEBUG__`, the `sentry-vendor` chunk, CSP `connect-src` from `VITE_SENTRY_DSN`; `VITE_SENTRY_DSN` in [apps/front-app/turbo.json](../../../../apps/front-app/turbo.json) env
- [apps/worker-api/src/index.ts](../../../../apps/worker-api/src/index.ts) - `sentry(app, …)` options, `setTag("request_id", …)`; `SENTRY_DSN` as `bindings.secret()` in [apps/worker-api/cloudflare.config.ts](../../../../apps/worker-api/cloudflare.config.ts), empty `bindings.text("")` in its `test` mode and Previews
- `sentry:sourcemaps` scripts in both app `package.json`; the source-map step in [.github/workflows/cd.yml](../../../../.github/workflows/cd.yml) (`SENTRY_ORG` gate, `SENTRY_AUTH_TOKEN`); `VITE_SENTRY_DSN` in [.github/workflows/preview.yml](../../../../.github/workflows/preview.yml)
- [.claude/rules/backend/hono-gateway.md](../../../../.claude/rules/backend/hono-gateway.md) (Sentry section), [.claude/rules/ops/release.md](../../../../.claude/rules/ops/release.md), [apps/front-app/AGENTS.md](../../../../apps/front-app/AGENTS.md)

## Probe

Read the scope end-to-end; trace one SPA error and one Worker exception from throw to `captureException`, and one trace from SPA navigation to the continued Worker span. Never run `sentry:sourcemaps` or any `sentry-cli` command that talks to Sentry.

## Axes

- **Initialization**: SDK inits before app modules evaluate (`instrument.ts` first import); disabled cleanly when the DSN is empty (locally, in tests, in Previews); React 19 `onUncaughtError`/`onCaughtError`/`onRecoverableError` wired per current docs; no double reporting between root hooks, error boundaries, and `captureClientError`.
- **Sensitive data**: `dataCollection` denies user info, cookies, headers, bodies, and query params on both sides; breadcrumbs drop console text and strip URL search/hash; `stackFrameVariables` off on the Worker; `setTag` carries only the opaque request id; nothing identifying a user or tenant in tags, contexts, transaction names, or route params (parameterized route names, not raw paths).
- **Sampling & tracing**: SPA and Worker agree on full-tracing environments and the production rate; the Worker continues the SPA's sampling decision; `tracePropagationTargets` limited to the API origin and matching the CORS allowed headers (`sentry-trace`, `baggage`); router tracing integration current for the installed TanStack Router.
- **Bundle cost**: SDK dropped from the build when `VITE_SENTRY_DSN` is unset; tracing lazy-loaded after first render; `__SENTRY_DEBUG__` stripped; `sentry-vendor` chunk split still matches the installed SDK's module layout.
- **Releases & source maps**: release name `<app>@<semver>` identical in SDK init and `sentry-cli`; debug IDs in both chunk and hidden source map; source maps uploaded, never served publicly; the upload runs between Workers upload and promote and cannot block a release.
- **Secrets & config**: `SENTRY_DSN` a Worker secret (`bindings.secret()`, never a text binding in a deployed mode), `VITE_SENTRY_DSN` public by design and in turbo env inputs; `SENTRY_AUTH_TOKEN` only in CD secrets; CSP `connect-src` covers the DSN origin.
- **Version currency**: `@sentry/react`, `@sentry/cloudflare`, `@sentry/hono` on one exact version; `@sentry/vite-plugin` and `@sentry/cli` compatible with it; options deprecated or renamed in the installed major.
- **Agent loop**: where Sentry lives and why is findable from `apps/front-app/AGENTS.md` and the `hono-gateway` rule; tests run with Sentry off and no network.

## Critical when

Sensitive data can reach Sentry (bodies, query strings, headers, identifiers in tags or transaction names); the SDK initializes too late to catch startup errors; an auth token or non-public DSN is exposed; source maps are served publicly; the SDK packages are on mismatched versions.

## Overlaps

Owns every Sentry-specific line in `vite.config.ts` and the `sentry(...)` options in `worker-api`; middleware position belongs to `hono`, the rest of the Vite config to `vite`, secret declaration mechanics (`bindings.secret()`) to `cf`.

## Accepted

- Sampling (full in dev/preview, 1% in production), the lazy tracing chunk, and the literal `import.meta.env.VITE_SENTRY_DSN` reads are deliberate - reasons in the why-comments of `sentry.ts` and `vite.config.ts`.
- Sentry covers exceptions only; traffic observability is Workers Observability ([.claude/rules/backend/hono-gateway.md](../../../../.claude/rules/backend/hono-gateway.md)). Do not suggest Sentry logs or metrics for traffic.
- The CD source-map step is optional and gated on `SENTRY_ORG` ([.claude/rules/ops/release.md](../../../../.claude/rules/ops/release.md)); a Sentry outage must not block a release.
