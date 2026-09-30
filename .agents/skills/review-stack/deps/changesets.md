---
id: changesets
summary: versioning config, release:check gate, release and Dependabot workflows
families: [toolchain]
packages: [@changesets/cli, @changesets/changelog-github]
paths: [.changeset/**, .github/workflows/release.yml, .github/workflows/changeset-pr-status.yml, .github/workflows/dependabot-changesets.yml, .github/actions/ci/check-changesets.mjs, .github/actions/lib/changesets.mjs, .github/actions/dependabot-changesets/**, .github/actions/release/**]
---

# Changesets

Changesets v3 plus `changesets/action` v2: the app version group, the changelog generator, the `release:check` PR gate, the release PR, and the Dependabot changeset writer.

## Ground truth

- **Stale-knowledge risk**: v3 renamed commands (`tag` → `git-tag`), changed defaults (`baseBranch` `main`, `privatePackages` off), added config (`changedFilePatterns`, `format`, `snapshot`), and moved prerelease changesets to `.changeset/pre/`. `changesets/action` v2 split into sub-actions (`select-mode`, `version`, `pr-status`, `pr-comment`).
- **Collector**: "changesets" at the installed major - config options and defaults, `changeset status` / `add` flags, the `changelog-github` options, and the `changesets/action` sub-action inputs and outputs.
- **Web fallback**: `changesets.dev` (guide, config, migration), the `packages/cli/CHANGELOG.md` and `packages/changelog-github/CHANGELOG.md` on GitHub, and `github.com/changesets/action` release notes.
- **Version currency**: catalog `@changesets/cli` and `@changesets/changelog-github` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); the `changesets/action/*` SHA pins in the workflows; the `$schema` version in [config.json](../../../../.changeset/config.json) against the installed `@changesets/config`.

## Scope

- [.changeset/config.json](../../../../.changeset/config.json) and the pending `.changeset/*.md`
- [release.yml](../../../../.github/workflows/release.yml), [changeset-pr-status.yml](../../../../.github/workflows/changeset-pr-status.yml), [dependabot-changesets.yml](../../../../.github/workflows/dependabot-changesets.yml), and the `Changesets` step of [ci.yml](../../../../.github/workflows/ci.yml)
- [check-changesets.mjs](../../../../.github/actions/ci/check-changesets.mjs), [changesets.mjs](../../../../.github/actions/lib/changesets.mjs), [write-changesets.mjs](../../../../.github/actions/dependabot-changesets/write-changesets.mjs)
- Rules `ops/changesets` and `ops/release` ↔ `.cursor` twins; skill `changeset`; [.changeset/README.md](../../../../.changeset/README.md)

## Probe

`pnpm release:check`, `pnpm release:status`, `pnpm exec changeset --help`, and the installed `node_modules/.pnpm/@changesets+config@*/node_modules/@changesets/config/schema.json` for the option list.

## Axes

- **Config currency**: every option in `config.json` exists at the installed version with the documented meaning; no key restates a default except the one the rule justifies; new options that would replace repo code (a built-in check, a changelog option) are flagged.
- **Gate soundness**: `release:check` still relies on `changeset status --since --output` semantics (exit 1 only when packages changed and no changeset changed since the ref, tracked files only, the JSON plan shape). If upstream changes any of these, the gate passes while checking nothing: Critical.
- **Catalog detection**: `runtimeCatalogChanges` still parses the `pnpm-workspace.yaml` catalog shape (default and named catalogs) and maps it to `dependencies`; pnpm catalog syntax changes are flagged.
- **Workflow contracts**: the `select-mode` outputs and `version` inputs the release workflow uses still exist; `pr-status` still runs without an install; the release PR branch name and author match the `ci.yml` skip.
- **Dependabot writer**: `createCommitOnBranch` input shape, the signing behavior, the Dependabot secret store, and the `[dependabot skip]` marker still work as the rule describes.
- **Agent loop**: the non-interactive `add` flags the rule and skill document still exist; the gate's diagnostics name the file, the rule, and a fix.

## Critical when

The gate or the release workflow passes while checking or versioning nothing; a token with write access reaches dependency code; a pre-mode or non-`vX.Y.Z` tag could reach CD.

## Overlaps

Workflow hardening and triggers belong to `/review ci`; the pnpm catalog itself to `pnpm`.

## Accepted

- `fixed: [["*"]]` relies on apps being unscoped (rule `quality/naming`); nothing machine-checks it.
- The presence half of the gate is coarse: any changed changeset in the branch satisfies it.
