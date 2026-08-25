---
name: pnpm
description: "pnpm workspace and dependency management for this monorepo. Triggers on: pnpm install, pnpm add/remove/update, workspace protocol, catalogs, filtering, lockfile, hoisting, allowBuilds, minimumReleaseAge, CI install failures, and dependency version drift. Use when user or agent: adds/removes packages, scaffolds workspace packages, debugs install/hoisting issues, updates shared tool versions, or changes pnpm-workspace.yaml."
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
| pnpm version | `11.20.0` (pinned via `packageManager` in root `package.json`) |
| Workspace globs | `apps/*`, `packages/*` in `pnpm-workspace.yaml` |
| Install (local) | `pnpm install` |
| Install (CI) | `pnpm install --frozen-lockfile` |
| Update all deps | `pnpm update` → `pnpm update --recursive --latest` (bumps catalog entries in `pnpm-workspace.yaml`) |
| Lockfile | Single `pnpm-lock.yaml` (pnpm workspace default) |
| Policy location | `pnpm-workspace.yaml` only — project `.npmrc` is auth-only under pnpm 11 |

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

Shared versions live in the **default catalog** in `pnpm-workspace.yaml` with `catalogMode: prefer` (prefer catalog on `pnpm add` when listed; one-off deps still allowed):

```yaml
catalog:
  '@cloudflare/vite-plugin': ^1.51.0
  '@tailwindcss/vite': ^4.3.3
  '@vitejs/plugin-react': ^6.0.5
  babel-plugin-react-compiler: ^1.0.0
  hono: ^4.13.0
  oxfmt: ^0.62.0
  oxlint: ^1.77.0
  oxlint-tsgolint: ^7.0.2001
  react: ^19.2.8
  react-dom: ^19.2.8
  tailwindcss: ^4.3.3
  typescript: ^7.0.2
  vite: ^8.2.0
  wrangler: ^4.119.0
  zod: ^4.4.3
```

TanStack packages (`@tanstack/*`) and `@types/*` are also in the catalog — see `pnpm-workspace.yaml` for the full list.

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

Keep front-app-only utilities (e.g. `rollup-plugin-visualizer`) out of the catalog. Escalate `catalogMode` to `strict` only after catalog coverage is complete.

**Workflow for bumping a shared tool:**

1. **All catalog + non-catalog deps:** `pnpm update` - runs `pnpm update --recursive --latest`, which rewrites catalog ranges in `pnpm-workspace.yaml` and keeps `"catalog:"` in manifests.
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

# Remove from one package
pnpm remove <pkg> --filter front-app

# Run command in one package + its deps
pnpm --filter worker-api... <cmd>

# Run command in one package only
pnpm --filter front-app <cmd>

# Update all deps (including catalog entries in pnpm-workspace.yaml)
pnpm update

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
| `allowBuilds` | Map of packages allowed (`true`) or denied (`false`) to run install scripts |
| `trustPolicy: no-downgrade` | Reject installs that would downgrade package trust/provenance |
| `blockExoticSubdeps: true` | Block exotic (non-registry) transitive dependencies |
| `minimumReleaseAge: 480` | 8-hour cooldown on newly published versions |
| `minimumReleaseAgeExclude` | Hotfix exceptions (`@cloudflare/*`, `wrangler`, `miniflare`, `typescript`) |

When `pnpm install` fails on a blocked build script:

1. Decide if the script is **necessary** (e.g. `esbuild`, `workerd`) or **optional**.
2. Add to `allowBuilds` in `pnpm-workspace.yaml` with `true` or `false`.
3. Re-run `pnpm install`.

Do **not** disable `strictDepBuilds` to silence failures.

## Hoisting Policy

Use pnpm strict linking defaults. This repository has no hoisting override: workspace dependencies use `workspace:*`, shared versions use `catalog:`, and each package declares every dependency it imports. pnpm 11 ignores non-auth project `.npmrc` settings, so package-manager policy belongs in `pnpm-workspace.yaml`. Fix a phantom dependency by declaring it in the owning package; do not add broad hoisting.

## CI

GitHub Actions uses:

1. `pnpm/setup` (pnpm v11+ successor to `pnpm/action-setup`) with `runtime: node@24`, store `cache: true`, and `install: false` (default install is not frozen)
2. `pnpm install --frozen-lockfile` (version comes from root `package.json` `packageManager`)
3. `pnpm turbo run <task> --affected`

Rules:

- Always commit `pnpm-lock.yaml` with manifest changes.
- CI uses `--frozen-lockfile` - lockfile must be in sync.
- Never commit `.env`, `.dev.vars`, or secrets.

## Common Mistakes

| Mistake | Correct approach |
|---------|------------------|
| Duplicate root-owned tools in each `package.json` | Keep OXC, Turbo, and Wrangler tooling at the narrowest actual owner |
| `pnpm add foo` at root without `-w` | Use `-w` for root deps, `--filter` for packages |
| Registry version for `@repo/*` | Use `workspace:*` |
| Registry version for a catalogued package | Use `catalog:` |
| Put install policy in `.npmrc` | Put it in `pnpm-workspace.yaml` |
| Hoist a missing package to mask a phantom dependency | Declare it in the importing package |
| Disable `strictDepBuilds` | Add entry to `allowBuilds` |
| Run `pnpm build` for app tasks | Use `pnpm turbo run build` or `pnpm build` |
| Hand-edit `pnpm-lock.yaml` | Run `pnpm install` to regenerate |

## Scaffolding a New Workspace Package

1. Create directory under `apps/` or `packages/` with `package.json` (`"private": true`).
2. Add `workspace:*` deps on shared packages as needed.
3. Use `catalog:` for shared tools (`hono`, `oxfmt`, `oxlint`, `vite`, etc.).
4. Run `pnpm install`.
5. Add a package `turbo.json` with `"extends": ["//"]` and a `tags` entry.
6. Add `AGENTS.md` if the package has non-trivial conventions.
