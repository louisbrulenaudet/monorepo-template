---
name: review-turborepo
description: "Turborepo review (task graph, boundaries tags, caching, remote cache, --affected usage) against current official Turborepo best practices. USE WHEN: user runs /review-turborepo or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review Turborepo

Review the Turborepo setup for alignment with current official best practices - task graph correctness, cache effectiveness, boundaries enforcement, and developer experience on this pnpm monorepo. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "caching only", "boundaries") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of Turborepo may be outdated. **Do not draft suggestions from memory alone.**

1. Resolve "Turborepo" via the **Context7 MCP** (`resolve-library-id` → `query-docs`): `turbo.json` schema (tasks, `dependsOn`, inputs/outputs, caches), boundaries tags syntax, global dependencies/env handling, `turbo query`.
2. For anything Context7 lacks, use **Firecrawl search/scrape restricted to the official domain** (`turborepo.com` docs) - boundaries reference, caching guide, upgrade notes for the pinned major.
3. Version currency: catalog `turbo` pin in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) vs latest stable; check the pinned major's deprecations against config keys in use (legacy keys are a common drift).
4. A local deep skill exists at `.agents/skills/turborepo/SKILL.md` - consult it for repo-specific conventions, but treat official docs as ground truth.
5. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- Root [turbo.json](../../../turbo.json) - task pipeline, `boundaries.tags`
- Per-app/package `turbo.json` files (`"extends": ["//"]`, `tags` entries) under `apps/*`, `packages/*`
- Root scripts using turbo filters in [package.json](../../../package.json); CI `--affected` phase in [.github/workflows/ci.yml](../../../.github/workflows/ci.yml)
- Remote-cache provisioning notes under `core/turborepo`; lockfile/pnpm integration

## Analysis axes

- **Task graph**: `dependsOn` correctness (build ← ^build, test/lint dependency shape); `inputs`/`outputs` declared so caches hit; env vars that affect builds captured (`env`/`globalEnv`) without over-invalidating.
- **Caching**: local cache behavior sane; remote cache configured per repo provisioning path; tasks that should not be cached (dev, deploy, promote) marked correctly.
- **Boundaries**: tag rules in root `turbo.json` enforce "nothing imports an app"; each package declares a valid tag (`app`, `contracts`, `contracts-base`, `lib`, `config`); `pnpm boundaries` is inside `ci`.
- **Scoping & CI**: filter idioms (`--filter=<pkg>`, `...pkg...`, `--affected`) used where intended; GitHub CI `--affected` limited to the check/test/build phase as documented.
- **Version currency**: new capabilities worth adopting (e.g. newer query/boundaries features); deprecated keys removed.

## DX & AI-agentic workflow

Verify agent-friendliness: scoped turbo iteration documented so agents avoid full-graph runs; `turbo query` available for graph inspection; cache misses explainable (hash inputs visible).

## Steps

1. Collect ground truth before reading config.
2. Read root + package turbo configs; trace one build and one test hash mentally through the graph.
3. Run `pnpm boundaries` to confirm green, and sample `turbo query` output.
4. Walk each analysis axis; note findings or explicit one-line "no issues".
5. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - wrong dependencies causing bad caches/skipped work, boundary violations.
2. **Improvements** - cache-hit improvements, graph simplification.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
