---
name: review-pnpm
description: "pnpm workspace review (pnpm-workspace.yaml catalog, security policies, allowBuilds, lockfile health) against current official pnpm best practices. USE WHEN: user runs /review-pnpm or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review pnpm

Review the pnpm workspace configuration for alignment with current official best practices - dependency management, supply-chain safety, and developer experience across this monorepo. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "catalog only", "security policies") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of pnpm may be outdated (fast-moving; settings move between `.npmrc` and `pnpm-workspace.yaml`). **Do not draft suggestions from memory alone.**

1. Resolve "pnpm" via the **installed documentation MCP collector** (whatever documentation MCP server(s) this project registers - library resolvers, vendor doc servers) for current `pnpm-workspace.yaml` settings semantics: `catalog`/`catalogMode`, `minimumReleaseAge`, `trustPolicy`, `allowBuilds`/`strictDepBuilds`, `blockExoticSubdeps`, audit config.
2. For anything the collector cannot resolve or lacks, **complete context collection with a direct web fetch** restricted to the official domain (`pnpm.io`) - settings reference, catalog docs, release notes for the pinned major. Use whichever web fetch/search tools are available.
3. Version currency: compare `packageManager` pin in [package.json](../../../package.json) and any pnpm-related catalog entries against latest stable; flag deprecated setting names still present.
4. A local deep skill exists at `.agents/skills/pnpm/SKILL.md` - consult it for repo-specific conventions, but treat official docs as ground truth.
5. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) - package globs, full `catalog:` map, `auditConfig`, `minimumReleaseAge` (+ excludes), `trustPolicy`, `allowBuilds`, `strictDepBuilds`, `blockExoticSubdeps`
- [package.json](../../../package.json) - `packageManager` pin + hash, `engines`/`devEngines`, root scripts
- Per-package `package.json` files (catalog vs workspace specifier discipline)
- `pnpm-lock.yaml` health; absence of stray `.npmrc`

## Analysis axes

- **Catalog hygiene**: every third-party dep uses `catalog:` and internal links use `workspace:*` (enforced by syncpack, but check for one-off drift); catalog versions coherent (no accidental major skew between related packages).
- **Supply chain**: `minimumReleaseAge` value sensible vs excludes list (Cloudflare/wrangler/miniflare/typescript exempted intentionally); `trustPolicy: no-downgrade` + provenance window; `allowBuilds` minimal (esbuild/sharp/workerd only) with `strictDepBuilds` fail-closed; `blockExoticSubdeps`; `auditConfig` ignores empty and justified if ever used.
- **Version currency**: new pnpm capabilities worth adopting (newer security settings, catalog features); `packageManager` pin current.
- **Workspace layout**: globs match reality; no hoisting workarounds that mask phantom dependencies.

## DX & AI-agentic workflow

Verify agent-friendliness: `pnpm install` deterministic in CI and agent worktrees; scripts discoverable via `pnpm run`; catalog as single source so agents add deps in exactly one place.

## Steps

1. Collect ground truth before reading config.
2. Read scope artifacts; run `pnpm deps:check` and a quick `pnpm audit --audit-level=high` sample to confirm gates green.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - supply-chain gaps, fail-open build policy, broken installs.
2. **Improvements** - policy/catalog alignment with current guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
