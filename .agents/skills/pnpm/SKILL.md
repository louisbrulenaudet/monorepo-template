---
name: pnpm
description: "pnpm workspace and dependency management for this monorepo. Triggers on: pnpm install, pnpm add/remove/update, workspace protocol, catalogs, filtering, lockfile, hoisting, permissions, allowBuilds, agent skills from dependencies, minimumReleaseAge, CI install failures, and dependency version drift. Use when user or agent: adds/removes packages, scaffolds workspace packages, debugs install/hoisting issues, updates shared tool versions, or changes pnpm-workspace.yaml."
metadata:
  source: project-owned
disable-model-invocation: true
---

# pnpm Skill

Fast, disk-efficient package manager for this **pnpm + Turborepo** monorepo. pnpm owns the dependency graph, lockfile, and supply-chain policy; Turborepo owns task orchestration (`build`, `lint`, `dev`, `--affected`).

## Division of Labor

| Concern | Tool | Agent action |
|---------|------|--------------|
| Add/remove/update deps | **pnpm** | `pnpm add`, `pnpm remove`, `pnpm up` |
| Shared version pins | **pnpm catalog** | Edit `pnpm-workspace.yaml` `catalog:` |
| Internal packages | **pnpm workspace** | `"@repo/foo": "workspace:*"` |
| Build/lint/dev/deploy | **Turborepo** | `pnpm turbo run <task>` or `pnpm <task>` |
| Affected CI | **Turborepo** | `pnpm turbo run <task> --affected` |

Do **not** put task logic in root `package.json` when it belongs in packages - see the `turborepo` skill.

## This Repo

| Setting | Value |
|---------|-------|
| pnpm version | `devEngines.packageManager` in root `package.json`. CI installs it through `pnpm/setup`; locally run that version (`pnpm self-update <version>`), because `pmOnFail: ignore` stops pnpm switching to it and keeps the pin out of `pnpm-lock.yaml` (GitHub's dependency graph reads only the lockfile's first YAML document, dependabot-core#15904) |
| Workspace globs | `apps/*`, `packages/*` in `pnpm-workspace.yaml` |
| Install (local) | `pnpm install` |
| Install (CI) | `pnpm install --frozen-lockfile` |
| Update all deps | `pnpm run update` → `pnpm update --recursive --latest` (bumps catalog entries in `pnpm-workspace.yaml`) |
| Lockfile | Single `pnpm-lock.yaml` (pnpm workspace default) |
| Policy location | `pnpm-workspace.yaml` only - project `.npmrc` is auth-only under pnpm 11 |

After adding a new app under `apps/`, run `pnpm install` before turbo commands.

## Workspace Protocol

Always link internal packages with the workspace protocol:

```json
{
  "dependencies": {
    "@repo/dtos-common": "workspace:*",
    "@repo/enums-common": "workspace:*"
  }
}
```

- `workspace:*` - always use the local workspace version (preferred).
- On publish, pnpm rewrites `workspace:` to semver ranges automatically.

Never duplicate a shared package version as a registry range in an app - use `workspace:*`.

## Catalogs (Shared Tool Versions)

Shared versions live in the **default catalog** in `pnpm-workspace.yaml` (read it for the entries) with `catalogMode: prefer`: `pnpm add` prefers a listed catalog entry, and a one-off installs as a literal range that fails `pnpm deps:check`. `catalogPrune: true` drops an entry once no manifest references it.

`cf` and `@cloudflare/vite-plugin` are exact beta pins: cf accepts only plugin versions `>=2.0.0-0 <3`, and each numbered plugin beta can change behavior. Bump the two deliberately and together, and re-check both pins after `pnpm run update` (`pnpm update --recursive --latest`).

`@hono/cli` is an exact `1.0.0-rc.*` pin: its npm `latest` tag is still `0.1.x`, so `pnpm run update` never advances it. Move it with `pnpm update @hono/cli@next` or by editing the catalog entry, and switch to a caret range once `1.0.0` ships.

Reference in any `package.json`:

```json
{
  "dependencies": {
    "hono": "catalog:"
  },
  "devDependencies": {
    "oxfmt": "catalog:",
    "oxlint": "catalog:"
  }
}
```

Escalate `catalogMode` to `strict` only after catalog coverage is complete.

**Workflow for bumping a shared tool:**

1. **All catalog + non-catalog deps:** `pnpm run update` - runs `pnpm update --recursive --latest`, which rewrites catalog ranges in `pnpm-workspace.yaml` and keeps `"catalog:"` in manifests.
2. **One catalog-managed package:** `pnpm update --recursive --latest <pkg>` (e.g. `oxfmt`).
3. **Manual pin:** edit `pnpm-workspace.yaml` `catalog:`, then `pnpm install`.
4. Run `pnpm run ci` after any dependency bump.

Do **not** bump the same package in multiple `package.json` files independently - use the catalog.

Workspace-level `overrides` (e.g. `@types/node`) stay in `pnpm-workspace.yaml`, not in individual manifests.

## Agent Command Cheat Sheet

```bash
# Add runtime dep to an app
pnpm add <pkg> --filter front-app

# Add dev dep to an app
pnpm add -D <pkg> --filter worker-api

# Add tooling dep to workspace root
pnpm add -D <pkg> -w

# Move a literal range that pnpm add wrote into the catalog (review the pnpm-workspace.yaml diff)
pnpm deps:fix && pnpm install

# Remove from one package
pnpm remove <pkg> --filter front-app

# Run command in one package + its deps
pnpm --filter worker-api... <cmd>

# Run command in one package only
pnpm --filter front-app <cmd>

# Update all deps (including catalog entries in pnpm-workspace.yaml)
pnpm run update

# Update one catalog-managed package to latest
pnpm up -r -L oxfmt

# Update within existing ranges only (no catalog bump)
pnpm up -r

# Inspect why a package is installed
pnpm why <pkg>

# Reproducible CI install
pnpm install --frozen-lockfile
```

Prefer `--filter <name>` over `cd apps/foo && pnpm add` - keeps context at repo root.

Package names: `front-app`, `worker-api`, `@repo/dtos-common`, `@repo/enums-common`, `@repo/typescript-config`.

## Security Settings

Configured in `pnpm-workspace.yaml`:

| Setting | Purpose |
|---------|---------|
| `strictDepBuilds: true` | Block lifecycle scripts unless explicitly allowed |
| `permissions` | Per-package capabilities: `build` allows (`true`) or denies (`false`) install scripts, `skills` links the agent skills a direct dependency ships. Replaces `allowBuilds`, which pnpm still reads |
| `skills.dirs` | `.agents/skills` only: pnpm links each granted skill there as `pnpm-<package>-<skill>` (gitignored by the nested `.gitignore`). Never add `.claude/skills`: the agent sandbox denies writes there and every agent-run install fails with `ERR_PNPM_AGENT_SKILL_LINK` |
| `trustPolicy: no-downgrade` | Reject installs that would downgrade package trust/provenance |
| `blockExoticSubdeps: true` | Block exotic (non-registry) transitive dependencies |
| `minimumReleaseAgeStrict: true` | Makes pnpm's default 24-hour cooldown (`minimumReleaseAge` unset) strict: an install that needs a version younger than 24 hours fails instead of taking it |
| `minimumReleaseAgeExclude` | Hotfix exceptions (`@cloudflare/*`, `cf`, `wrangler`, `miniflare`, `typescript`). An exact-version entry (e.g. a `workerd@<version>` that `miniflare` pins) is temporary: delete it once that version is past the 24-hour cooldown. Never exempt bare `workerd`, which runs install scripts |

When `pnpm install` fails on a blocked build script:

1. Decide if the script is **necessary** (e.g. `esbuild`, `workerd`) or **optional**.
2. Add `build: true` or `build: false` under the package in `permissions` in `pnpm-workspace.yaml` (`pnpm approve` writes the same entry).
3. Re-run `pnpm install`.

Do **not** disable `strictDepBuilds` to silence failures.

When `pnpm permissions` lists a direct dependency awaiting `skills`, grant it with `skills: true` only after reading what it ships, then run `pnpm install`. Claude Code reads `.claude/skills`, so each granted skill also needs a committed symlink `.claude/skills/<name>` → `../../.agents/skills/pnpm-<package>-<skill>`, created by a human (the sandbox denies it to agents). A skill vendored through `skills-lock.json` for the same package is then removed.

## Hoisting Policy

Use pnpm strict linking defaults. This repository has no hoisting override: workspace dependencies use `workspace:*`, shared versions use `catalog:`, and each package declares every dependency it imports. pnpm 11 ignores non-auth project `.npmrc` settings, so package-manager policy belongs in `pnpm-workspace.yaml`. Fix a phantom dependency by declaring it in the owning package; do not add broad hoisting.

## CI

GitHub Actions uses:

1. `pnpm/setup` (pnpm v11+ successor to `pnpm/action-setup`) with `runtime: node@26` and `install: false` (default install is not frozen); the store cache is `actions/cache` keyed on `pnpm-lock.yaml` in `ci.yml` only, since `pnpm/setup`'s `cache: true` saves a new entry on every run
2. `pnpm install --frozen-lockfile` (version comes from root `package.json` `devEngines.packageManager`)
3. `pnpm turbo run <task> --affected`

Rules:

- Always commit `pnpm-lock.yaml` with manifest changes.
- CI uses `--frozen-lockfile` - lockfile must be in sync.
- Never commit `.env`, `.dev.vars`, or secrets.

## Common Mistakes

| Mistake | Correct approach |
|---------|------------------|
| Duplicate root-owned tools in each `package.json` | Keep OXC, Turbo, cf, and Wrangler tooling at the narrowest actual owner |
| `pnpm add foo` at root without `-w` | Use `-w` for root deps, `--filter` for packages |
| Registry version for `@repo/*` | Use `workspace:*` |
| Registry version for a catalogued package | Use `catalog:` |
| Put install policy in `.npmrc` | Put it in `pnpm-workspace.yaml` |
| Hoist a missing package to mask a phantom dependency | Declare it in the importing package |
| Disable `strictDepBuilds` | Add a `build` entry to `permissions` |
| Run `pnpm build` for app tasks | Use `pnpm turbo run build` or `pnpm build` |
| Hand-edit `pnpm-lock.yaml` | Run `pnpm install` to regenerate |

## Scaffolding a New Workspace Package

1. Create directory under `apps/` or `packages/` with `package.json` (`"private": true`).
2. Add `workspace:*` deps on shared packages as needed.
3. Use `catalog:` for shared tools (`hono`, `oxfmt`, `oxlint`, `vite`, etc.).
4. Run `pnpm install`.
5. Add a package `turbo.json` with `"extends": ["//"]` and a `tags` entry.
6. Add `AGENTS.md` if the package has non-trivial conventions.
