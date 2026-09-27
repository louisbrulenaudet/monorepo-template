---
id: knip
summary: knip.jsonc passes, suppressions, production pass, agent reporter
families: [toolchain]
packages: [knip]
paths: [knip.jsonc, .claude/rules/quality/knip.md]
---

# Knip

Knip across workspaces: unused file/export/dependency detection accuracy, suppression discipline, and the agent-facing symbols reporter.

## Ground truth

- **Stale-knowledge risk**: frequent releases; plugin and issue-type surface evolves.
- **Collector**: "Knip" at the installed major - config schema (`workspaces`, `ignoreIssues`, `includeEntryExports`), issue types, plugin detection (Vite/Vitest/Turbo/Cloudflare), reporters, `--fix`/`--fix-type`.
- **Web fallback**: `knip.dev` - configuration reference, issue-type docs, release notes.
- **Version currency**: catalog `knip` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); flag deprecated config keys or removed issue types.

## Scope

- [knip.jsonc](../../../../knip.jsonc) - workspace entries, `treatConfigHintsAsErrors`, `includeEntryExports`, per-workspace overrides
- Root scripts in [package.json](../../../../package.json): `knip`, `knip:production` (`--production --strict`), `knip:agent` (`--reporter symbols`)
- Gate position inside `pnpm run ci`; `@internal` tagging convention for test-only exports
- [.claude/rules/quality/knip.md](../../../../.claude/rules/quality/knip.md) ↔ `.cursor/rules/quality/knip.mdc` (per-override rationale lives there)

## Probe

Read `knip.jsonc`; run `pnpm knip`, `pnpm knip:production`, and `pnpm knip:agent` once each.

## Axes

- **Coverage**: both passes green; entry points/plugins detected for Vite/Vitest/Turbo/Wrangler surfaces; no whole-workspace ignore masking real debt (each `ignoreWorkspaces` entry justified in the knip rule).
- **Suppression discipline**: no blanket `ignore`; scoped patterns only (`ignoreIssues`, `"dep!"`/`"!tests/**!"`); every override traceable to a reason; `treatConfigHintsAsErrors` keeps config honest.
- **Production pass**: `--production --strict` reflects shipped code (dev-only deps excluded deliberately); workspace isolation verified.
- **Fix workflow**: `knip --fix --fix-type dependencies,catalog` safe for agents; results verified by reinstall + gates.
- **Version currency**: new issue types/plugins worth adopting; renamed options migrated.
- **Agent loop**: `pnpm knip:agent` emits one line per unused symbol matching the current reporter contract; agent docs reference it.

## Critical when

Gates failing; dead code masked and shipping in production builds.

## Overlaps

`catalog:` specifier policy belongs to `syncpack` and `pnpm`.

## Accepted

- Every override justified in [.claude/rules/quality/knip.md](../../../../.claude/rules/quality/knip.md); `knip.jsonc` stays comment-free by policy.
