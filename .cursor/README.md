# Cursor project setup

This folder holds Cursor-specific agent configuration. Shared hook **scripts** live in [`hooks/`](../hooks/) at the repo root.

## Layout

| Path | Purpose |
|------|---------|
| [`rules/`](rules/) | Recursive category tree of project rules (`.mdc`) - parallel to [`.claude/rules/`](../.claude/rules/) |
| [`hooks.json`](hooks.json) | Agent hook wiring → scripts under [`hooks/`](../hooks/) |
| [`agents/`](agents/) | Custom subagents (`ci-verifier`, `docs-researcher`, `test-runner`) |
| [`commands/`](commands/) | Thin slash wrappers → [`.agents/skills/review*/SKILL.md`](../.agents/skills/) (`/review`, `/review-ci`, …) |

## Global instructions

Cursor loads root and nested `AGENTS.md` files by directory. Rules under `rules/**` add guidance according to their `globs` or `alwaysApply` frontmatter. Subfolders organize rules but do not scope them. Hook authoring guide: [hooks/AGENTS.md](../hooks/AGENTS.md).

## Sync policy

When changing rules or subagents, keep Claude Code and Cursor in sync:

- `.cursor/rules/**/*.mdc` ↔ `.claude/rules/**/*.md` (same category and basename)
- `.cursor/agents/*.md` ↔ `.claude/agents/*.md`
- Hook scripts: edit only [`hooks/`](../hooks/) (see [hooks/README.md](../hooks/README.md))
- Skills: source of truth under [`.agents/skills/`](../.agents/skills/); `.claude/skills/<name>` are symlinks (except Cursor-only `skills-update`)
- Review skills: edit [`.agents/skills/review*/SKILL.md`](../.agents/skills/); Cursor commands are thin wrappers to those skills

Full inventory: skill `monorepo-agent-setup`.

## Subagents

Invoke explicitly with `/ci-verifier`, `/docs-researcher`, or `/test-runner`, or let Agent delegate when descriptions match (they include "Use PROACTIVELY").

## Hooks

Wiring is in [`hooks.json`](hooks.json): `beforeShellExecution` (git guards, `failClosed`), `afterFileEdit` (format/lint), `sessionStart` (logging). Scripts live under [`hooks/git/`](../hooks/git/), [`hooks/quality/`](../hooks/quality/), and [`hooks/logging/`](../hooks/logging/). Debug logs: `hooks/logs/`. See [Cursor hooks docs](https://cursor.com/docs/hooks).
