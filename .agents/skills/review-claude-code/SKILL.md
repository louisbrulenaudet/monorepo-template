---
name: review-claude-code
description: "Claude Code setup review (settings.json, permissions, rules, hooks, agents, memory, worktrees) against current official best practices. USE WHEN: user runs /review-claude-code or explicitly asks for this review. DO NOT USE WHEN: reviewing app code, other dev dependencies, or implementing features."
disable-model-invocation: true
context: fork
background: true
model: sonnet
effort: medium
---

# Review Claude Code

Review the Claude Code setup for alignment with current official best practices, optimal developer experience (DX), and AI collaboration quality on this large pnpm/Turborepo monorepo. Your reply must be a **plan of suggested changes**: concise, actionable, structured - not only prose.

## Invocation

Text after the slash command is additional scope/focus (e.g. "permissions only", "hooks") - narrow the review accordingly.

## Ground truth (mandatory)

Your pre-trained knowledge of Claude Code may be outdated. **Do not draft suggestions from memory alone.**

1. Resolve "Claude Code" via the **installed documentation MCP collector** (whatever documentation MCP server(s) this project registers - library resolvers, vendor doc servers) for settings keys, permission rule syntax, hooks events, subagent frontmatter, and worktree behavior.
2. For anything the collector cannot resolve or lacks, **complete context collection with a direct web fetch** restricted to the official docs domain(s) (`code.claude.com`, `docs.anthropic.com`) - settings reference, permissions, IAM, hooks, sandboxing, worktrees, output styles, best-practices guidance for large codebases. Use whichever web fetch/search tools are available.
3. Check version currency: compare installed CLI (`claude --version`) against the latest stable release notes (official changelog). Flag deprecated settings keys or hook events still present in config.
4. Cite the retrieved source next to every finding; label anything you could not verify as **Unverified**.

## Scope artifacts

- [.claude/settings.json](../../../.claude/settings.json) - permissions, hooks wiring, model/env
- [.claude/rules/](../../../.claude/rules/) - path-scoped rules, `core/guardrails` always-on surface
- [.claude/agents/](../../../.claude/agents/) - `verifier`, `bundle-analyzer`, `docs-researcher` (`tools` least privilege)
- [.claude/skills/](../../../.claude/skills/) - symlinks into `.agents/skills/`; broken or stale links
- [CLAUDE.md](../../../CLAUDE.md) + nested per-app/package guides - duplication vs pointer discipline
- `.claude/worktrees/`, `.claude/status-line.sh`, `.mcp.json` server list
- Sync parity with the Cursor tree (see `/review-cursor` for that side's depth)

## Analysis axes

- **Settings & permissions**: allowlist shape (read-only defaults, explicit write paths); no overly broad `Bash(*)` grants; deny rules for secrets/`.dev.vars`; sandboxing options where supported; env/model keys current (not deprecated).
- **Context hygiene**: root `CLAUDE.md` stays a map with pointers, not duplicated detail; path-scoped rules actually scoped (no accidental always-on beyond `guardrails`); no stale rules referencing removed files; skill descriptions tight so unused skills are not preloaded.
- **Hooks**: PreToolUse/PostToolUse wiring matches `hooks/AGENTS.md`; deterministic, fast, fail-closed where intended; logs not polluting transcripts.
- **Subagents**: each agent declares minimal `tools`; prompts restate binding constraints (Explore/Plan do not load `CLAUDE.md`); no author/reviewer conflict for review agents.
- **Worktrees & large-repo behavior**: worktree usage aligned with official large-codebase practices; agent worktrees provision isolated credentials (no real env files copied).
- **Version currency**: settings schema drift vs installed CLI version; new features worth adopting (e.g. newer permission or sandbox capabilities) noted under Improvements/Optional.

## DX & AI-agentic workflow

Verify the setup maximizes agentic effectiveness: machine-readable outputs (`pnpm lint:agent`, `knip --reporter symbols`) reachable without noise; documentation MCP servers project-scoped, without duplicate registration; clean worktree (generated `dist/`, `worker-configuration.d.ts` handled per repo policy).

## Steps

1. Collect ground truth (docs above) before reading config.
2. Read every scope artifact end-to-end.
3. Walk each analysis axis; note findings or an explicit one-line "no issues".
4. Compose the plan grouped Critical / Improvements / Optional; each item states **what**, **where**, **why**, and its source citation.

## Output format

1. **Critical** - broken, insecure, or deprecated-and-failing configuration.
2. **Improvements** - worthwhile alignment with current best practice.
3. **Optional** - nice-to-haves; prefix pure polish with **Nit:**.

Read-only review: produce the plan only; implement nothing unless explicitly asked afterwards.
