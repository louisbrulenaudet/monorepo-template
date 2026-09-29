---
id: turborepo
summary: task graph, caching, boundaries, `--affected`
families: [toolchain]
packages: [turbo]
paths: [turbo.json, **/turbo.json, .github/workflows/ci.yml, .claude/rules/core/turborepo.md, .claude/rules/core/boundaries.md]
---

# Turborepo

Turborepo: task-graph correctness, cache effectiveness, boundaries enforcement, and scoping on this pnpm monorepo.

## Ground truth

- **Collector**: "Turborepo" - `turbo.json` schema (tasks, `dependsOn`, inputs/outputs, caches), boundaries tags syntax, global dependencies/env handling, `turbo query`.
- **Local schema**: installed `node_modules/turbo/schema.json` is authoritative for which `turbo.json` keys and `futureFlags` the pinned version accepts - check every key in use against it.
- **Local skill**: `.agents/skills/turborepo/SKILL.md`. It points at `node_modules/turbo/docs/`, which turbo 2.11.x does not ship; when that directory is absent, fall back to the collector and `turborepo.dev`.
- **Web fallback**: `turborepo.dev` - boundaries reference, caching guide, upgrade notes for the pinned major.
- **Version currency**: catalog `turbo` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); check the pinned major's deprecations against keys in use.

## Scope

- Root [turbo.json](../../../../turbo.json) - task pipeline, `boundaries.tags`
- Per-app/package `turbo.json` (`"extends": ["//"]`, `tags`) under `apps/*`, `packages/*`
- Root scripts using turbo filters in [package.json](../../../../package.json); CI `--affected` phase in [.github/workflows/ci.yml](../../../../.github/workflows/ci.yml)
- [.claude/rules/core/turborepo.md](../../../../.claude/rules/core/turborepo.md) (remote-cache provisioning, `//#` root tasks)

## Probe

Read root and package turbo configs; trace one build and one test hash through the graph. Run `pnpm boundaries` and sample `turbo query`.

## Axes

- **Task graph**: `dependsOn` correct (build ← `^build`, test/lint shape); `inputs`/`outputs` declared so caches hit; build-affecting env captured (`env`/`globalEnv`) without over-invalidating.
- **Caching**: local cache sane; remote cache per repo provisioning; dev/deploy/upload marked uncached; `types` cached on `cloudflare.config.ts` with `.cloudflare/types/**` outputs.
- **Boundaries**: root tags enforce "nothing imports an app"; each package has a valid tag (`app`, `contracts`, `contracts-base`, `lib`, `config`); `pnpm boundaries` inside `ci`.
- **Scoping & CI**: filter idioms (`--filter=<pkg>`, `...pkg...`, `--affected`) used where intended; GitHub CI `--affected` limited to check/test/build.
- **Version currency**: newer query/boundaries features worth adopting; deprecated keys removed.
- **Agent loop**: scoped iteration documented so agents avoid full-graph runs; `turbo query` available; cache misses explainable.

## Critical when

Wrong dependencies causing bad caches or skipped work; boundary violations.

## Overlaps

Workflow-level CI structure beyond turbo invocations is out of scope (`/review ci`).

## Accepted

- Task rationale in [.claude/rules/core/turborepo.md](../../../../.claude/rules/core/turborepo.md) (`//#` root tasks, cache inputs) and tag rationale in [core/boundaries.md](../../../../.claude/rules/core/boundaries.md).
