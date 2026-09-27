---
id: claude-code
summary: settings, permissions, rules, hooks, agents, skills, worktrees
families: [agents]
packages: []
paths: [.claude/**, .cursor/**, .mcp.json, CLAUDE.md, AGENTS.md, **/AGENTS.md, **/CLAUDE.md, hooks/**, .agents/skills/**]
version_cmd: claude --version
---

# Claude Code

The Claude Code setup: settings, permissions, rules, hooks, subagents, skills, and worktrees - for DX and AI collaboration on this monorepo.

## Ground truth

- **Collector**: "Claude Code" - settings keys, permission rule syntax, hook events, subagent and skill frontmatter, sandbox, worktree behavior.
- **Local skill**: `.agents/skills/monorepo-agent-setup/SKILL.md` for the dual-tree layout and sync policy.
- **Web fallback**: `code.claude.com`, `docs.anthropic.com` - settings reference, permissions, hooks, sandboxing, skills, subagents, worktrees, large-codebase guidance.
- **Version currency**: installed CLI (`claude --version`) against the official changelog; flag deprecated settings keys or hook events.

## Scope

- [.claude/settings.json](../../../../.claude/settings.json) - permissions, hooks wiring, sandbox, model/env
- [.claude/rules/](../../../../.claude/rules/) - path-scoped rules, always-on `core/guardrails` and `quality/comments`
- [.claude/agents/](../../../../.claude/agents/) - `explorer`, `planner`, `verifier`, `bundle-analyzer`, `docs-researcher` (`tools` least privilege)
- [.claude/skills/](../../../../.claude/skills/) - symlinks into `.agents/skills/`; broken or stale links
- [CLAUDE.md](../../../../CLAUDE.md) + nested per-app/package guides - duplication vs pointer discipline
- `.claude/plugins/`, `.claude/status-line.sh`, `.mcp.json` server list; parity with the Cursor tree
- [hooks/AGENTS.md](../../../../hooks/AGENTS.md)

## Probe

Read every scope artifact end-to-end; run `pnpm hooks:test`.

## Axes

- **Settings & permissions**: allowlist shape (read-only defaults, explicit write paths); no broad `Bash(*)`; deny rules for secrets and `.dev.vars`/`.env*`; sandbox options current; env/model keys not deprecated.
- **Context hygiene**: root `CLAUDE.md` a map with pointers; path-scoped rules actually scoped (nothing always-on beyond the two intended); no rules referencing removed files; skill descriptions tight.
- **Hooks**: PreToolUse/PostToolUse wiring matches `hooks/AGENTS.md`; deterministic, fast, fail-closed where intended; logs out of transcripts.
- **Subagents & skills**: each agent declares minimal `tools`; prompts restate binding constraints; human-only skills keep `disable-model-invocation: true`; no dangling skill symlinks.
- **Worktrees & large-repo behavior**: aligned with official large-codebase practice; worktrees never copy real env files.
- **Version currency**: settings schema drift vs installed CLI; new permission/sandbox/hook capabilities worth adopting.
- **Agent loop**: machine-readable outputs (`pnpm lint:agent`, `pnpm knip:agent`) reachable without noise; documentation MCP servers project-scoped with no duplicate registration.

## Critical when

Broken, insecure, or deprecated-and-failing configuration; a deny or hook that silently does not apply.

## Overlaps

Lint/format hook payloads belong to `oxc`; turbo task wiring belongs to `turborepo`.

## Accepted

- Deliberate layout and sync choices recorded in `.agents/skills/monorepo-agent-setup/SKILL.md` and [hooks/AGENTS.md](../../../../hooks/AGENTS.md).
- `CLAUDE.md` and `.claude/settings.json` are edit-protected at user level; propose a patch, never flag the protection itself.
- `sandbox.enableWeakerNetworkIsolation: true` in `.claude/settings.json`: pnpm 12 verifies its own signed release against registry.npmjs.org, which fails under the macOS sandbox without it.
