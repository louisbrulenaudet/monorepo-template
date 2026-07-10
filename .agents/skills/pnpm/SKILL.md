---
name: pnpm
description: |
  pnpm workspace and dependency management for this monorepo. Triggers on: pnpm install, pnpm add/remove/update, workspace protocol, catalogs, filtering, lockfile, hoisting, allowBuilds, minimumReleaseAge, CI install failures, and dependency version drift. Use when user or agent: adds/removes packages, scaffolds workspace packages, debugs install/hoisting issues, updates shared tool versions, or changes pnpm-workspace.yaml / .npmrc.
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
| Build/lint/dev/deploy | **Turborepo** | `pnpm turbo run <task>` or `make <task>` |
| Affected CI | **Turborepo** | `pnpm turbo run <task> --affected` |

Do **not** put task logic in root `package.json` when it belongs in packages — see the `turborepo` skill.

## This Repo

| Setting | Value |
|---------|-------|
| pnpm version | `11.10.0` (pinned via `packageManager` in root `package.json`) |
| Workspace globs | `apps/*`, `packages/*` in `pnpm-workspace.yaml` |
| Install (local) | `make install` → `pnpm install` |
| Install (CI) | `make install-frozen` → `pnpm install --frozen-lockfile` |
| Update all deps | `make update` → `pnpm update --recursive --latest` (bumps catalog entries in `pnpm-workspace.yaml`) |
| Lockfile | Single `pnpm-lock.yaml` (`shared-workspace-lockfile=true`) |

After adding a new app under `apps/`, run `make install` before turbo commands.

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

- `workspace:*` — always use the local workspace version (preferred).
- On publish, pnpm rewrites `workspace:` to semver ranges automatically.

Never duplicate a shared package version as a registry range in an app — use `workspace:*`.

## Catalogs (Shared Tool Versions)

Shared dev/tool versions live in the **default catalog** in `pnpm-workspace.yaml`:

```yaml
catalog:
  oxfmt: ^0.58.0
  oxlint: ^1.73.0
  typescript: 7.0.2
  tailwindcss: ^4.3.2
  zod: ^4.4.3
```

Reference in any `package.json`:

```json
{
  "devDependencies": {
    "oxfmt": "catalog:",
    "oxlint": "catalog:"
  }
}
```

**Workflow for bumping a shared tool:**

1. **All catalog + non-catalog deps:** `make update` — runs `pnpm update --recursive --latest`, which rewrites catalog ranges in `pnpm-workspace.yaml` and keeps `"catalog:"` in manifests.
2. **One catalog-managed package:** `pnpm update --recursive --latest <pkg>` (e.g. `oxfmt`).
3. **Manual pin:** edit `pnpm-workspace.yaml` `catalog:`, then `pnpm install`.
4. Run `make ci` after any dependency bump.

Do **not** bump the same package in multiple `package.json` files independently — use the catalog.

Workspace-level `overrides` (e.g. `@types/node`) stay in `pnpm-workspace.yaml`, not in individual manifests.

## Agent Command Cheat Sheet

```bash
# Add runtime dep to an app
pnpm add <pkg> --filter front-app

# Add dev dep to an app
pnpm add -D <pkg> --filter worker-api

# Add tooling dep to workspace root
pnpm add -D <pkg> -w

# Remove from one package
pnpm remove <pkg> --filter front-app

# Run command in one package + its deps
pnpm --filter worker-api... <cmd>

# Run command in one package only
pnpm --filter front-app <cmd>

# Update all deps (including catalog entries in pnpm-workspace.yaml)
make update

# Update one catalog-managed package to latest
pnpm up -r -L oxfmt

# Update within existing ranges only (no catalog bump)
pnpm up -r

# Inspect why a package is installed
pnpm why <pkg>

# Reproducible CI install
pnpm install --frozen-lockfile
```

Prefer `--filter <name>` over `cd apps/foo && pnpm add` — keeps context at repo root.

Package names: `front-app`, `worker-api`, `@repo/dtos-common`, `@repo/enums-common`, `@repo/typescript-config`.

## Security Settings

Configured in `pnpm-workspace.yaml` and `.npmrc`:

| Setting | Purpose |
|---------|---------|
| `strict-dep-builds=true` | Block lifecycle scripts unless explicitly allowed |
| `allowBuilds` | Map of packages allowed (`true`) or denied (`false`) to run install scripts |
| `minimumReleaseAge: 480` | 8-hour cooldown on newly published versions |
| `minimumReleaseAgeExclude` | Hotfix exceptions (`@cloudflare/*`, `wrangler`, `typescript`, etc.) |

When `pnpm install` fails on a blocked build script:

1. Decide if the script is **necessary** (e.g. `esbuild`, `workerd`) or **optional**.
2. Add to `allowBuilds` in `pnpm-workspace.yaml` with `true` or `false`.
3. Re-run `pnpm install`.

Do **not** disable `strict-dep-builds` to silence failures.

## Hoisting Policy (Cloudflare Workers)

```ini
shamefully-hoist=false
public-hoist-pattern[]=@cloudflare/*
public-hoist-pattern[]=*types*
```

- **Do not** enable `shamefully-hoist=true` unless a tool is completely broken — it defeats pnpm's strict layout.
- If a specific tool cannot resolve a phantom dependency, add a targeted `public-hoist-pattern[]=<pattern>` in `.npmrc`.
- Workers apps need `@cloudflare/*` and `*types*` hoisted for TypeScript and Wrangler.

## Performance Settings (`.npmrc`)

Already configured — do not remove without reason:

- `side-effects-cache=true` — skip re-running unchanged postinstall scripts
- `package-import-method=clone-or-copy` — fast linking from store
- `network-concurrency=16` — parallel fetches
- `recursive-install=true` — `pnpm install` at root installs all workspace packages

## CI

GitHub Actions uses:

1. `pnpm/action-setup@v5` (reads `packageManager` from root `package.json`)
2. `actions/setup-node` with `cache: pnpm`
3. `make install-frozen`
4. `pnpm turbo run <task> --affected`

Rules:

- Always commit `pnpm-lock.yaml` with manifest changes.
- CI uses `--frozen-lockfile` — lockfile must be in sync.
- Never commit `.env`, `.dev.vars`, or secrets.

## Common Mistakes

| Mistake | Correct approach |
|---------|------------------|
| Duplicate `oxfmt`/`oxlint` versions in each `package.json` | Use `catalog:` |
| `pnpm add foo` at root without `-w` | Use `-w` for root deps, `--filter` for packages |
| Registry version for `@repo/*` | Use `workspace:*` |
| `shamefully-hoist=true` for one broken tool | Targeted `public-hoist-pattern` |
| Disable `strict-dep-builds` | Add entry to `allowBuilds` |
| Run `pnpm build` for app tasks | Use `pnpm turbo run build` or `make build` |
| Hand-edit `pnpm-lock.yaml` | Run `pnpm install` to regenerate |

## Scaffolding a New Workspace Package

1. Create directory under `apps/` or `packages/` with `package.json` (`"private": true`).
2. Add `workspace:*` deps on shared packages as needed.
3. Use `catalog:` for shared tools (`oxfmt`, `oxlint`, etc.).
4. Run `make install`.
5. Add turbo tasks in root `turbo.json` if the package has scripts.
6. Add `AGENTS.md` if the package has non-trivial conventions.
