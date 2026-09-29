---
id: oxc
summary: oxlint rules and ignores, oxfmt, tsgolint, `--format=agent`
families: [toolchain]
packages: [oxlint, oxfmt, oxlint-tsgolint, oxc-transform-react, oxlint-plugin-react-doctor]
paths: [.oxlintrc.json, .oxfmtrc.json, .claude/rules/quality/code-style.md, .claude/rules/quality/lint-config.md, hooks/**]
---

# OXC

The OXC toolchain (oxlint + oxfmt + oxlint-tsgolint): lint and format quality, speed, and the agent-facing output contract.

## Ground truth

- **Stale-knowledge risk**: fast-moving project.
- **Collector**: "OXC" (and "oxfmt" separately if covered) - linter config schema, categories/plugins, nested config, formatter options, output formats.
- **Web fallback**: `oxc.rs` - linter config reference, output formats (notably the `--format=agent` contract), formatter docs, changelog for breaking changes.
- **Version currency**: catalog `oxlint`, `oxfmt`, `oxlint-tsgolint`, `oxc-transform-react` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml) and installed versions; flag deprecated rules/config keys still present.

## Scope

- [.oxlintrc.json](../../../../.oxlintrc.json), [.oxfmtrc.json](../../../../.oxfmtrc.json)
- Root scripts in [package.json](../../../../package.json): `lint:check`, `lint:fix`, `lint:agent`, `lint:ci`, `format:*`
- [.claude/rules/quality/code-style.md](../../../../.claude/rules/quality/code-style.md) and [lint-config.md](../../../../.claude/rules/quality/lint-config.md) ↔ their `.cursor/rules/quality/*.mdc` twins
- Hook wiring calling format/lint after edits (`.claude/settings.json`, `.cursor/hooks.json`)
- Ignore coverage: which paths oxlint/oxfmt skip vs repo-generated dirs (`.cloudflare/`, `dist/`)

## Probe

Read the scope; run `pnpm lint:agent` once to sample the real output shape.

## Axes

- **Ignores & speed**: unnecessary files/folders excluded so runs stay fast; single root pass preserved (per-file `oxlint .` breaks Tailwind context rules - root AGENTS.md contract); `SYNCKIT_TIMEOUT` still appropriate.
- **Rules**: category/plugin selection current (new default categories since install?); better-tailwindcss context resolution (`settings.better-tailwindcss.entryPoint` resolved from CWD); type-aware tsgolint rules used where valuable without losing Turbo caching.
- **Agent output format**: `--format=agent` is the canonical contract (`file:line:col: severity plugin(rule): message help:`); agents/rules/hook docs point at `lint:agent`, never the TTY-dependent human format; suppressions use `oxlint-disable*` only.
- **CI formats**: `--format=github` for PR annotations still correct for the installed version.
- **Formatter**: oxfmt options coherent; check-only gate (`format:check`) wired into `ci`; no conflicts between oxfmt output and lint rules.
- **Version currency**: new plugins/categories worth adopting; breaking-change exposure in current pinning.
- **Agent loop**: edit → hook format/lint → `pnpm lint:agent` parseable; suppressions discoverable; zero ambiguity about which command agents must read.

## Critical when

Gates broken; agents or CI consume the wrong output format; deprecated config keys still in use.

## Overlaps

Owns the better-tailwindcss lint rules and their context resolution (`tailwind` reviews the styles themselves).

## Accepted

- Style and suppression policy in [.claude/rules/quality/code-style.md](../../../../.claude/rules/quality/code-style.md), config rationale in [lint-config.md](../../../../.claude/rules/quality/lint-config.md); `**/*.md` and `**/package.json` are excluded from oxfmt on purpose (reasons inline in `.oxfmtrc.json`).
