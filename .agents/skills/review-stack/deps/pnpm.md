---
id: pnpm
summary: workspace catalog, supply-chain settings, allowBuilds, lockfile
families: [toolchain]
packages: []
paths: [pnpm-workspace.yaml, package.json, .npmrc]
version_cmd: pnpm --version
---

# pnpm

The pnpm workspace: dependency management, supply-chain safety, and install determinism.

## Ground truth

- **Stale-knowledge risk**: fast-moving; settings move between `.npmrc` and `pnpm-workspace.yaml`.
- **Collector**: "pnpm" - `pnpm-workspace.yaml` settings semantics: `catalog`/`catalogMode`, `minimumReleaseAge`, `trustPolicy`, `allowBuilds`/`strictDepBuilds`, `blockExoticSubdeps`, audit config.
- **Local skill**: `.agents/skills/pnpm/SKILL.md` for repo conventions; official docs remain ground truth.
- **Web fallback**: `pnpm.io` - settings reference, catalog docs, release notes for the pinned major.
- **Version currency**: `packageManager` pin in [package.json](../../../../package.json) vs latest stable; flag deprecated setting names.

## Scope

- [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml) - package globs, `catalog:` map, `audit`, `minimumReleaseAgeExclude`, `trustPolicy`, `allowBuilds`, `strictDepBuilds`, `blockExoticSubdeps`
- [package.json](../../../../package.json) - `packageManager` pin + hash, `engines`/`devEngines`, root scripts
- Per-package `package.json` files (catalog vs workspace specifiers)
- `pnpm-lock.yaml` health; absence of stray `.npmrc`

## Probe

Read the scope; run `pnpm deps:check` and `pnpm audit --audit-level=high`.

## Axes

- **Catalog hygiene**: third-party deps on `catalog:`, internal on `workspace:*` (one-off drift); no accidental major skew between related packages.
- **Supply chain**: `minimumReleaseAge` left at the 1440 default and its excludes still needed (Cloudflare/wrangler/miniflare/typescript intentionally exempt); `trustPolicy: no-downgrade` + provenance window; `allowBuilds` minimal (esbuild/sharp/workerd) with `strictDepBuilds` fail-closed; `blockExoticSubdeps`; `audit.ignore` entries (not the deprecated `auditConfig`) absent or justified.
- **Workspace layout**: globs match reality; no hoisting workarounds masking phantom dependencies.
- **Version currency**: new security settings or catalog features worth adopting; `packageManager` pin current.
- **Agent loop**: install deterministic in CI and worktrees (`--frozen-lockfile --prefer-offline`); scripts discoverable via `pnpm run`; one place to add a dependency.

## Critical when

Supply-chain gaps; fail-open build policy; broken installs.

## Overlaps

Specifier lint rules and drift groups belong to `syncpack`; unused dependencies belong to `knip`.

## Accepted

- The `minimumReleaseAge` excludes (Cloudflare, wrangler, miniflare, typescript) are intentional; flag only a new exclude without a reason.
- Inline catalog comments in `pnpm-workspace.yaml` (e.g. Sentry packages bumped together) state deliberate pins.
