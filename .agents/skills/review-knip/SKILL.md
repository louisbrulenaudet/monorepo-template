---
name: review-knip
description: "Knip review (knip.jsonc passes, issue coverage, production pass, auto-fix workflow) against current official Knip best practices. USE WHEN: user runs /review-knip or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review Knip

Review the Knip setup for alignment with current official best practices - unused file/export/dependency detection accuracy across workspaces, false-positive suppression discipline, and the agent-facing symbols reporter. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "production pass only", "workspace overrides") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of Knip may be outdated (frequent releases; plugin and issue-type surface evolves). **Do not draft suggestions from memory alone.**

1. Resolve "Knip" via the **installed documentation MCP collector** (whatever documentation MCP server(s) this project registers - library resolvers, vendor doc servers) at the installed major: config schema (`workspaces`, `ignoreIssues`, `includeEntryExports`), issue types, plugin detection (Vite/Vitest/Turbo/Cloudflare), reporters, `--fix`/`--fix-type` behavior.
2. For anything the collector cannot resolve or lacks, **complete context collection with a direct web fetch** restricted to the official domain (`knip.dev`) - configuration reference, issue-type docs, release notes for breaking changes. Use whichever web fetch/search tools are available.
3. Version currency: catalog `knip` in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) vs latest stable; flag deprecated config keys or removed issue types still present.
4. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [knip.jsonc](../../../knip.jsonc) - workspace entries, `treatConfigHintsAsErrors`, `includeEntryExports`, per-workspace overrides
- Root scripts in [package.json](../../../package.json): `knip`, `knip:production` (`--production --strict`), `knip:agent` (`--reporter symbols`)
- Gate position inside `pnpm run ci`; JSDoc `@internal` tagging convention for test-only exports
- Knip policy docs: `.claude/rules/quality/knip.md` ↔ `.cursor/rules/quality/knip.mdc`

## Analysis axes

- **Coverage**: both the default and production passes stay green; entry points/plugins detected correctly for Vite/Vitest/Turbo/Wrangler surfaces; no whole-workspace `ignoreWorkspaces` masking real debt (current `packages/vitest-config!` entry should carry a justification).
- **Suppression discipline**: no blanket `ignore`; scoped patterns only (`ignoreIssues`, suffixed patterns like `"dep!"`/`"!tests/**!"`); every override traceable to a reason; `treatConfigHintsAsErrors` keeps config honest.
- **Production pass**: `--production --strict` reflects shipped-code reality (dev-only deps like devtools excluded deliberately); workspace isolation verified.
- **Fix workflow**: `knip --fix --fix-type dependencies,catalog` safe for agents to run; results verified by reinstall + gates.
- **Version currency**: new issue types/plugins worth adopting; renamed options migrated.

## DX & AI-agentic workflow

Verify agent-friendliness: `pnpm knip:agent` emits one machine-readable line per unused symbol - confirm output shape matches current reporter contract and that agent docs reference it; findings actionable without human interpretation.

## Steps

1. Collect ground truth before reading config.
2. Read knip.jsonc; run all three passes once (`pnpm knip`, `pnpm knip:production`, sample `pnpm knip:agent`) to confirm green and capture real output shapes.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - gates failing, masked dead code shipping in production builds.
2. **Improvements** - suppression/config alignment with current guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
