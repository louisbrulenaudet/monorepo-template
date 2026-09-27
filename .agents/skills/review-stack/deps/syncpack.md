---
id: syncpack
summary: specifier rules, drift groups, field formatting
families: [toolchain]
packages: [syncpack]
paths: [.syncpackrc.json, **/package.json]
---

# syncpack

syncpack: specifier enforcement (`catalog:` vs `workspace:*`), version-drift detection across workspaces, and package.json field formatting.

## Ground truth

- **Stale-knowledge risk**: majors changed config shape significantly.
- **Collector**: "syncpack" at the installed major - config file name/schema, lint rules (`specifiers`, `versions`, `semverRange`), filter/sort/format options, CLI commands (`lint`, `fix`, `format`).
- **Web fallback**: `jamiemason.github.io/syncpack` - config reference and release notes for the pinned major.
- **Version currency**: catalog `syncpack` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); confirm the config format matches the pinned major.

## Scope

- syncpack config at repo root (locate the actual file: `.syncpackrc*` / `syncpack.config.*`)
- Root scripts in [package.json](../../../../package.json): `deps:check`, `deps:fix`, `deps:format`, `deps:format:check`, and their position in `pnpm run ci`
- [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml) `catalog:` as canonical source; per-package specifiers (peer-range exemptions)
- Dependency-workflow docs under `.claude/rules/quality/` ↔ `.cursor` twin

## Probe

Read the config; run `pnpm deps:check` and `pnpm deps:format:check`.

## Axes

- **Specifier policy**: rules enforce exactly the repo contract - third-party `catalog:`, internal `@repo/**` `workspace:*`, peer ranges exempt; violations fail `deps:check`.
- **Drift detection**: groups catch same-intent packages diverging (React/TanStack families, oxlint toolchain), defined deliberately rather than defaults alone.
- **Formatting automation**: field ordering via `syncpack format`; `deps:format:check` wired into CI and the `//#deps:format:check` root task; `deps:fix` safe to run blindly.
- **Catalog interplay**: syncpack rules and pnpm `catalogMode: prefer` reinforce each other; no double source of truth.
- **Version currency**: renamed rules/options adopted; deprecated config removed.
- **Agent loop**: `syncpack lint` failures precise and machine-actionable; add-a-dependency procedure (catalog → `catalog:` → `pnpm deps:fix`) documented.

## Critical when

Gates failing or not wired into CI; policy violations shipping.

## Overlaps

pnpm settings and supply-chain policy belong to `pnpm`.

## Accepted

- `package.json` field order is owned by `syncpack format`, not oxfmt (see `.oxfmtrc.json`).
