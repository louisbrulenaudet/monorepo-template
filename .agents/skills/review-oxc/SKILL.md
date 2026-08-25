---
name: review-oxc
description: "OXC review (oxlint rules/ignores, oxfmt, tsgolint type-aware rules, agent output format) against current official OXC best practices. USE WHEN: user runs /review-oxc or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
---

# Review OXC

Review the OXC toolchain (oxlint + oxfmt + oxlint-tsgolint) for alignment with current official OXC best practices - linting/formatting quality, speed, and optimal developer experience (DX) and AI collaboration on a modern TypeScript monorepo. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "rules only", "formatter") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of OXC may be outdated (fast-moving project). **Do not draft suggestions from memory alone.**

1. Resolve "OXC" (and "oxfmt" separately if covered) via the **Context7 MCP** (`resolve-library-id` → `query-docs`): linter config schema, categories/plugins, nested config, formatter options, output formats.
2. For anything Context7 lacks, use **Firecrawl search/scrape restricted to the official domain** (`oxc.rs`) - linter config reference, output formats (notably the `--format=agent` contract), formatter docs, changelog for breaking changes.
3. Version currency: compare catalog entries (`oxlint`, `oxfmt`, `oxlint-tsgolint`, `oxc-transform-react`) in [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) and installed versions against latest stable; flag deprecated rules/config keys still present in config.
4. Cite the retrieved source next to every finding; label anything unverifiable as **Unverified**.

## Scope artifacts

- [.oxlintrc.json](../../../.oxlintrc.json), [.oxfmtrc.json](../../../.oxfmtrc.json)
- Root scripts in [package.json](../../../package.json): `lint:check`, `lint:fix`, `lint:agent`, `lint:ci`, `format:*`
- [.claude/rules/quality/code-style.md](../../../.claude/rules/quality/code-style.md) ↔ `.cursor/rules/quality/code-style.mdc`
- Hook wiring calling format/lint after edits (`.claude/settings.json`, `.cursor/hooks.json`)
- Ignore coverage: which paths oxlint/oxfmt skip vs repo-generated dirs (`dist/`, `worker-configuration.d.ts`)

## Analysis axes

- **Ignores & speed**: unnecessary files/folders excluded so runs stay fast; single root pass preserved (per-file `oxlint .` breaks Tailwind context rules - repo AGENTS.md contract); `SYNCKIT_TIMEOUT` still appropriate.
- **Rules**: category/plugin selection current (new default categories since install?); better-tailwindcss plugin context resolution (`settings.better-tailwindcss.entryPoint` resolved from CWD); type-aware tsgolint rules used where valuable without losing Turbo caching.
- **Agent output format**: `--format=agent` is the canonical machine-readable contract (one line per diagnostic: `file:line:col: severity plugin(rule): message help:`); confirm agents/rules/hook docs point at `lint:agent`, never the TTY-dependent human format; inline suppressions use `oxlint-disable*` directives only.
- **CI formats**: `--format=github` pinned for PR annotations remains correct for current OXC versions.
- **Formatter**: oxfmt options parity with prettier-era expectations; check-only gate (`format:check`) wired into `ci`; no conflicts between oxfmt output and lint rules.
- **Version currency**: new plugins/categories/capabilities worth adopting; breaking-change exposure in current pinning.

## DX & AI-agentic workflow

Verify the loop an agent actually experiences: edit → hook format/lint → `pnpm lint:agent` parseability; suppressions discoverable; zero ambiguity about which command agents must read.

## Steps

1. Collect ground truth before reading config.
2. Read scope artifacts; run `pnpm lint:agent` once to sample real output shape.
3. Walk each analysis axis; note findings or explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional with **what**, **where**, **why**, and source citations.

## Output format

1. **Critical** - broken gates, wrong output format consumed by agents/CI, deprecated config.
2. **Improvements** - rule/category alignment, ignore-surface fixes.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
