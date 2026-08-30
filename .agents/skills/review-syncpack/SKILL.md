---
name: review-syncpack
description: "syncpack review (specifier rules for catalog/workspace links, formatting of package.json fields, drift gates) against current official syncpack best practices. USE WHEN: user runs /review-syncpack or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review syncpack

Review the syncpack setup for alignment with current official best practices - dependency specifier enforcement (`catalog:` vs `workspace:*`), version-drift detection across workspaces, and package.json hygiene automation. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "lint rules only", "formatting") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of syncpack may be outdated (major versions changed config shape significantly). **Do not draft suggestions from memory alone.**

1. Resolve "syncpack" via the **Context7 MCP** (`resolve-library-id` → `query-docs`) at the installed major: config file name/schema, lint rule set (`specifiers`, `versions`, `semverRange`), filter/sort/format options, CLI commands (`lint`, `fix`, `format`) and flags.
2. For anything Context7 lacks, use **Firecrawl search/scrape restricted to the official domain** (`jamiemason.github.io/syncpack`) - config reference and release notes for the pinned major.
3. Version currency: catalog `syncpack` in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) vs latest stable; confirm config format matches the pinned major (older JSON configs break on newer majors).
4. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- syncpack config file at repo root (`.syncpackrc` / `syncpack.config.*` - locate actual file)
- Root scripts in [package.json](../../../package.json): `deps:check` (`syncpack lint`), `deps:fix` (`syncpack fix`), `deps:format` (`syncpack format`) and their gate position inside `pnpm run ci`
- [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) `catalog:` as the canonical source; per-package specifiers (`catalog:` third-party, `workspace:*` internal, peer-range exemptions)
- `.claude/rules/quality/` dependency-workflow documentation ↔ `.cursor` twin

## Analysis axes

- **Specifier policy**: lint rules enforce exactly the repo contract - third-party deps must use `catalog:`, internal `@repo/**` must use `workspace:*`, peer ranges exempt; violations fail `deps:check`.
- **Drift detection**: semver grouping catches same-intent packages diverging across workspaces (e.g. React/TanStack families, oxlint toolchain); groups defined deliberately rather than defaults alone.
- **Formatting automation**: field ordering normalized via `syncpack format`; `deps:format --check` wired into CI; `deps:fix` safe to run blindly by agents (no destructive rewrites).
- **Catalog interplay**: syncpack rules and pnpm `catalogMode: prefer` reinforce each other; no rules fighting pnpm catalogs (double sources of truth).
- **Version currency**: renamed rules/options at installed major adopted; deprecated config removed.

## DX & AI-agentic workflow

Verify agent-friendliness: `syncpack lint` failures are precise and machine-actionable; the add-a-dependency procedure (catalog first → `catalog:` reference → `pnpm deps:fix` if flagged) documented so agents follow it deterministically.

## Steps

1. Collect ground truth before reading config.
2. Read the syncpack config; run `pnpm deps:check` and `pnpm deps:format --check` to confirm gates green.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - gates failing/not wired into CI, policy violations shipping.
2. **Improvements** - rule/group alignment with current guidance.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
