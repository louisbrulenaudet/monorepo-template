# Changesets

A changeset is a small markdown file in this folder recording **which apps changed and how much**, so the release workflow can compute versions and write changelogs. Upstream docs: [changesets.dev](https://changesets.dev).

Nothing in this repo is published to npm. Every workspace is `"private": true`, there is no `publishConfig` and no registry configured. **The release act is a Cloudflare Workers deploy**, and the release coordinate is a single git tag `vX.Y.Z` shared by both apps.

## Commands

| Command | Does |
|---------|------|
| `pnpm changeset` | Create a changeset (interactive: pick packages, pick bump) |
| `pnpm changeset --empty` | Create a changeset that bumps nothing |
| `pnpm release:status` | Read-only: what is pending and what the next versions will be |

To preview the actual file edits locally: `GITHUB_TOKEN=$(gh auth token) pnpm exec changeset version`, then **discard the result** (`git checkout -- .`). CI owns versioning; the token is needed because `@changesets/changelog-github` resolves commit authors. `pnpm release:status` answers the same question without touching the tree.

## When a changeset is required

- **Required** when a PR changes `apps/front-app` or `apps/worker-api` — anything that ships.
- **Required** when a PR changes `packages/dtos-common`, `packages/enums-common`, or `packages/correlation-id` — these are wire contracts and shared runtime code, so a change must reach production.
- **`--empty`** for a change to a deployable that deliberately should not produce a release.
- **Not needed** for docs, tests, agent rules, or tooling-only PRs.

The `Changeset PR status` workflow comments on every PR with what will and will not be released. It is advisory and does not block merging.

## Version semantics

`front-app` and `worker-api` are a `fixed` group, so they **always share one version** and bump together even when only one has a changeset. That is what makes a single `vX.Y.Z` tag a valid release coordinate, and `create-release-tag` fails closed if the two ever drift.

A changeset naming `@repo/dtos-common`, `@repo/enums-common`, or `@repo/correlation-id` patch-bumps both apps via `updateInternalDependencies: "patch"` and therefore ships a deploy — which is the point, since those are wire contracts and shared runtime code. `@repo/typescript-config` and `@repo/vitest-config` do **not** cascade: they are devDependencies only, and Changesets does not propagate a bump across a devDependency edge. A changeset for either versions just that package.

## The release PR

While any changeset sits on `main`, the `Release` workflow keeps a `chore: release` PR open on branch `changeset-release/main`.

**Do not push commits to that branch.** On every push to `main` the branch is reset from the current `main` tip, `changeset version` re-runs, and a single commit is force-pushed — so the PR always reflects all of `main` plus all pending changesets, and any manual edit is discarded. Corrections belong in a new changeset on `main`.

Merging that PR is the release act. Full detail: `.claude/rules/ops/release.md`.
