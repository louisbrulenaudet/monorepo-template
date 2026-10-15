---
id: jscpd
summary: .jscpd.json, the PR duplication diff, the whole-repo local scan
families: [toolchain]
packages: [jscpd]
paths: [.jscpd.json, .github/workflows/quality.yml, .github/actions/quality/**, .claude/rules/ops/quality-report.md]
---

# jscpd

Copy/paste detection: the report-only whole-repo scan and the PR `Code quality` comment that lists the clones a PR adds or resolves.

## Ground truth

- **Stale-knowledge risk**: CLI flags, baseline options, and similarity scoring change between minors.
- **Collector**: "jscpd" at the installed version - config keys (`format`, `ignore`, `minTokens`, `threshold`), reporters, baseline flags (`--baseline-from-ref`, `--changed`).
- **Web fallback**: `github.com/kucherenko/jscpd` - README, `CHANGELOG.md`, GitHub releases.
- **Version currency**: catalog `jscpd` in [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml); flag renamed or removed flags the workflow passes.

## Scope

- [.jscpd.json](../../../../.jscpd.json) - `format`, `ignore`
- Root script `jscpd` in [package.json](../../../../package.json)
- The two jscpd steps in [quality.yml](../../../../.github/workflows/quality.yml) and the parser in [build-report.mjs](../../../../.github/actions/quality/build-report.mjs) (`jscpd-report.json` shape)
- [.claude/rules/ops/quality-report.md](../../../../.claude/rules/ops/quality-report.md) ↔ `.cursor/rules/ops/quality-report.mdc`

## Probe

Read the scope; run `pnpm jscpd` once.

## Axes

- **Detection accuracy**: `format` covers the shipped languages; `ignore` excludes generated and vendored code without hiding authored code.
- **PR diff**: the `--baseline-from-ref` invocations still exist at the installed version and mark new and resolved clones as the report expects.
- **Report contract**: the JSON reporter output path and fields match what `build-report.mjs` reads.
- **Version currency**: new flags or modes that would replace workflow code (for example a built-in changed-only mode); scoring changes that shift findings.
- **Agent loop**: `pnpm jscpd` stays report-only and its output names file and line ranges an agent can act on.

## Critical when

The PR comment silently reports no duplication because a flag or the report shape changed.

## Overlaps

Workflow hardening (pins, permissions, triggers) belongs to rule `ops/ci`; unused code belongs to `knip`.

## Accepted

- jscpd is report-only, never in `check` or `ci` ([quality-report.md](../../../../.claude/rules/ops/quality-report.md)).
- Every `ignore` entry is justified in the `.jscpd.json` section of that rule.
