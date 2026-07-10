# Cursor project setup

This folder holds Cursor-specific agent configuration. Shared hook **scripts** live in [`hooks/`](../hooks/) at the repo root.

## Layout

| Path | Purpose |
|------|---------|
| [`rules/`](rules/) | Path-scoped project rules (`.mdc`) - parallel to [`.claude/rules/`](../.claude/rules/) |
| [`hooks.json`](hooks.json) | Agent hook wiring → scripts under [`hooks/`](../hooks/) |
| [`agents/`](agents/) | Custom subagents (`ci-verifier`, `docs-researcher`, `test-runner`) |
| [`commands/`](commands/) | Slash commands for structured reviews (`/review`, `/review-ci`, …) |

## Global instructions

Cursor loads [AGENTS.md](../AGENTS.md) at the repo root. Path-scoped rules in `rules/` add file-specific guidance on top. Hook authoring guide: [hooks/AGENTS.md](../hooks/AGENTS.md).

## Sync policy

When changing rules or subagents, keep Claude Code and Cursor in sync:

- `.cursor/rules/*.mdc` ↔ `.claude/rules/*.md`
- `.cursor/agents/*.md` ↔ `.claude/agents/*.md`
- Hook scripts: edit only [`hooks/`](../hooks/) (see [hooks/README.md](../hooks/README.md))

## Subagents

Invoke explicitly with `/ci-verifier`, `/docs-researcher`, or `/test-runner`, or let Agent delegate when descriptions match (they include "Use PROACTIVELY").

## Hooks

Wiring is in [`hooks.json`](hooks.json); scripts are grouped under [`hooks/git/`](../hooks/git/), [`hooks/quality/`](../hooks/quality/), and [`hooks/logging/`](../hooks/logging/). Debug logs: `hooks/logs/`.

Cloud Agents also load `.cursor/hooks.json` from the repo. See [Cursor hooks docs](https://cursor.com/docs/hooks).
