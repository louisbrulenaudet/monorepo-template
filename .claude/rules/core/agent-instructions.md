---
paths:
  - ".claude/rules/**"
  - ".cursor/rules/**"
  - "**/AGENTS.md"
  - "**/CLAUDE.md"
  - ".claude/agents/**"
  - ".cursor/agents/**"
---

# Agent Instructions

How the instruction layers load, and how to edit them without growing context. Long-form layout and sync policy: skill `monorepo-agent-setup`.

## Loading (Claude Code, verified)

- Root `CLAUDE.md` → `@AGENTS.md` and every rule without `paths` load at session start and in every custom subagent. Path-scoped rules and a nested `CLAUDE.md` → `AGENTS.md` load when a matching file is Read (subagents included) and then stay loaded. Built-in `Explore` / `Plan` load none of it.
- Markdown links are never followed: a link costs only its text, and the target loads only if an agent Reads it.

## Placement

- **One fact, one home**: the file that loads at the fact's point of use. Files that load together - same `paths`, a rule plus the nested `AGENTS.md` of the directory it covers, anything plus the always-on layer - never restate each other.
- Always-on (root `AGENTS.md`, rules without `paths`): only what almost every task needs. Path-scoped rule: what matters while editing the matching files - pick `paths` by where the content is used, not by topic. Nested `AGENTS.md`: the package map and local workflows. Skill: multi-step procedures. `README.md`: humans.
- A config file's rationale lives in a rule scoped to that file ([knip.md](../quality/knip.md), [lint-config.md](../quality/lint-config.md)), and the config stays comment-free where [comments.md](../quality/comments.md) says so.

## Density

- Imperative bullets, one line each ([markdown-style.md](../quality/markdown-style.md)): the rule, then only the reason a reader would otherwise undo it.
- Do not restate what the triggering file already shows, what a hook, lint rule, or setting enforces (name the enforcer in one clause when the agent must know), or generic framework knowledge. No diagrams repeating a list, no doc-link lists, no history beyond one clause. Bold only a hard constraint.
- Remove a requirement only after showing it is stated elsewhere at the same point of use, enforced (hook, lint, settings, CI), or derivable from the file that triggers the rule.
