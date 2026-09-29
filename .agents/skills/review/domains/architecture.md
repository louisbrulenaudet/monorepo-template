---
id: architecture
summary: workspace layout, boundaries and dependency direction, Worker roles, RPC vs HTTP, data ownership, trust boundaries between components
model: sonnet
---

# Architecture

Is the monorepo shaped the way root `AGENTS.md` says - the right code in the right workspace, dependencies pointing the right way, Workers talking the right way - and does each component's trust assumption match what its callers guarantee?

## Ground truth

- Root [AGENTS.md](../../../../AGENTS.md): Worker Prefixes, Where to Put Things, Enforced Boundaries, Decision Checklist.
- Rules: [core/boundaries](../../../../.claude/rules/core/boundaries.md), [core/turborepo](../../../../.claude/rules/core/turborepo.md), [backend/service-bindings](../../../../.claude/rules/backend/service-bindings.md), [contracts/contracts](../../../../.claude/rules/contracts/contracts.md), [quality/naming](../../../../.claude/rules/quality/naming.md), [frontend/react](../../../../.claude/rules/frontend/react.md) (Layout).
- Skill `turborepo` for `turbo query` and task-graph semantics (version-matched docs under `node_modules/turbo/docs`).

## Scope

[pnpm-workspace.yaml](../../../../pnpm-workspace.yaml), root and every workspace `package.json` and `turbo.json`, root [turbo.json](../../../../turbo.json) `boundaries.tags`, every `apps/*/cloudflare.config.ts` (bindings only), `apps/*/src/index.ts`, `packages/*/src/index.ts` and `exports` maps, each workspace's `AGENTS.md` + `CLAUDE.md`. A path or workspace focus narrows to that workspace and its direct dependents.

## Probe

`pnpm boundaries`, `pnpm turbo query ls`, `pnpm turbo query affected --packages` (with a `diff` focus), `pnpm knip:agent` (unused exports and files as evidence of dead surface), `git log --follow --format='%h %s' -- <file>`.

## Axes

- **Layout and roles**: every app's prefix matches its production surface (Worker Prefixes table); a Worker that is RPC + queue keeps `worker-*` with the dual-handler layout; queue-only and dual-handler Workers use `handlers/request.ts`, `handlers/message.ts`, shared `services/`, minimal `index.ts`; no shared library code under `apps/`, no app code under `packages/`.
- **Dependency direction**: nothing imports an app or its `cloudflare.config.ts`; package-to-package edges match the `boundaries.tags` allow-lists; `workspace:*` for every `@repo/*` edge; `pnpm boundaries` is green and every workspace has a `turbo.json` tag.
- **Worker-to-Worker**: service-binding RPC addressed by Worker name in the caller's `cloudflare.config.ts`, never HTTP to a public URL and never a package import; public HTTP only on gateway, `webhook-*`, `mcp-*`, `front-*`; background or retriable work goes to a queue (or Workflows for multi-step), not a fire-and-forget subrequest.
- **Data ownership**: each DB schema, migration, and binding lives in exactly one owning `worker-*` / `queue-*` under `src/db/`; never `packages/db-*`; never the same data binding on two apps; others reach it by RPC or a queue.
- **Contracts and public API**: a shape crossing a Worker, HTTP, queue, or webhook boundary lives in `@repo/dtos-common` (rule `contracts/contracts`); shared value sets in `@repo/enums-common`; packages expose a minimal `exports` map and consumers never deep-import past it; `@repo/typescript-config` and `@repo/vitest-config` stay config-only.
- **App registration**: every app under `apps/` declares `monorepo.deployOrder` and `monorepo.healthPath` (gateways before the SPAs that call them); nothing else lists apps; every `apps/*`, `packages/*`, and `hooks/` directory has its `AGENTS.md` + `CLAUDE.md` pair.
- **Trust boundaries between components**: map each principal (browser, provider webhook, MCP client, calling Worker) to the surface it reaches and the capability behind it; for each hop, compare what the caller guarantees with what the callee assumes (an RPC method that trusts a tenant or user field its caller never verified, a queue consumer that trusts the producer's payload identity); name which field is authoritative for identity at each hop.
- **Durable copies**: for any sensitive data, list every place it persists (DB, KV, cache, queue, DLQ, logs, Sentry) and check the owning app's `AGENTS.md` states retention and deletion for each (rule `core/guardrails`, Sensitive data).
- **Frontend structure**: `front-*` layout per rule `frontend/react` (pages, thin routes, services + `queryOptions` pairs, `#/*` imports); the SPA reaches backends over HTTP only.

## Critical when

An app imported by anything; a business `worker-*` with public HTTP; Worker-to-Worker over HTTP; two apps binding the same database; a shared contract re-declared inside an app; an RPC or queue hop whose callee trusts identity its caller never established.

## Overlaps

Turborepo task keys and caching (`dependsOn`, inputs, `global`) belong to `review-stack turborepo`; workflow structure to `ci`; `cloudflare.config.ts` modes and secrets to `configuration`; the security controls on each surface to `security`; dead exports and one-caller layers to `simplicity`.

## Accepted

- Package allow-lists and their rationale: rule [core/boundaries](../../../../.claude/rules/core/boundaries.md).
- The transit-node `check-types` pattern and root `//#` tasks: rule [core/turborepo](../../../../.claude/rules/core/turborepo.md).
