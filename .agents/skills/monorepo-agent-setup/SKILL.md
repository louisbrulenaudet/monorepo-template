---
name: monorepo-agent-setup
description: >
  USE WHEN: editing Cursor/Claude agent config, rules, hooks, skills, MCP, subagents, slash commands, or dual-tree sync; or when asking how Claude vs Cursor instructions are laid out in this monorepo. DO NOT USE WHEN: implementing app features, Workers, or frontend UI unless the task is specifically about agent tooling.
disable-model-invocation: true
---

# Monorepo agent setup

Canonical layout and sync policy for **Cursor** and **Claude Code** in this repo.

## Memory layout

| Layer | Claude Code | Cursor |
|-------|-------------|--------|
| Global instructions | [CLAUDE.md](../../../CLAUDE.md) (`@AGENTS.md`) | [AGENTS.md](../../../AGENTS.md) |
| Path-scoped rules | [`.claude/rules/`](../../../.claude/rules/) (`*.md`) | [`.cursor/rules/`](../../../.cursor/rules/) (`*.mdc`) |
| Hooks wiring | [`.claude/settings.json`](../../../.claude/settings.json) | [`.cursor/hooks.json`](../../../.cursor/hooks.json) |
| Hook scripts | [`hooks/`](../../../hooks/) (shared) | [`hooks/`](../../../hooks/) (shared) |
| Subagents | [`.claude/agents/`](../../../.claude/agents/) | [`.cursor/agents/`](../../../.cursor/agents/) |
| Review workflows | Skills under `.agents/skills/review*` (symlinked for Claude); Cursor [`.cursor/commands/`](../../../.cursor/commands/) wrappers |
| Deep skills | Symlinks → [`.agents/skills/`](../../) | [`.agents/skills/`](../../) (source of truth) |
| Nested app guides | `CLAUDE.md` per app/package | `AGENTS.md` per app/package |

- Claude: nested `CLAUDE.md` loads on demand; debug with `tail -f hooks/logs/instructions-loaded.log`.
- Cursor: nested `AGENTS.md` by directory; `.mdc` rules attach via `globs` / `alwaysApply`. Debug: **Customize → Hooks**.
- Rule folders (`core`, `frontend`, `backend`, `contracts`, `quality`) organize only; scoping is frontmatter (`paths` vs `globs`/`alwaysApply`).
- Vite config rule: `.claude/rules/frontend/vite-config.md` ↔ `.cursor/rules/frontend/vite-config.mdc` - `apps/front-*/vite.config.ts` only.
- Ports rule: `.claude/rules/backend/ports.md` ↔ `.cursor/rules/backend/ports.mdc` - `wrangler.jsonc`, app `package.json`, `front-*/vite.config.ts`.
- TSConfig rule: `.claude/rules/quality/typescript-config.md` ↔ `.cursor/rules/quality/typescript-config.mdc` - `packages/typescript-config/**`, `**/tsconfig*.json`.

See [`.cursor/README.md`](../../../.cursor/README.md) and [`hooks/AGENTS.md`](../../../hooks/AGENTS.md).

## Content taxonomy (what belongs where)

Put instructions in the layer that matches how often agents need them. Path-scoped rules save context; `alwaysApply` / rules without `paths` cost the same as root `AGENTS.md`.

| Layer | Put here | Examples |
|-------|----------|----------|
| Root [`AGENTS.md`](../../../AGENTS.md) | Always-on project map for almost every task | Overview, architecture diagram, worker prefixes, where-to-put, essential make targets, architecture decision bullets, pointers |
| Path-scoped rules (mirrored `.cursor` / `.claude`) | Only when editing matching files | Ports / `inspector_port` / `strictPort`, wrangler secrets, contract workflow, oxlint style, TSConfig presets |
| Nested app/package `AGENTS.md` | Package-local workflows | `apps/front-app`, `worker-api`, `dtos-common` |
| Skills | Deep / on-demand procedures | `monorepo-agent-setup`, `turborepo`, `hono`, review skills |
| [`README.md`](../../../README.md) | Human-facing docs | Full port registry, scaffolding tutorials |

Do **not** duplicate path-scoped or linter detail in root `AGENTS.md`. Prefer a one-line pointer to the owning rule, skill, or README.

## Sync policy

When changing agent setup, keep both tools in sync:

1. **Rules:** edit both `.cursor/rules/<cat>/<name>.mdc` and `.claude/rules/<cat>/<name>.md` (remap frontmatter: Cursor `description`/`globs`/`alwaysApply` ↔ Claude `paths`).
2. **Agents:** edit both `.cursor/agents/<name>.md` and `.claude/agents/<name>.md` (keep product-native keys: `model`, `tools`, `readonly`, `color`).
3. **Hooks:** edit scripts only under `hooks/`; update both `.cursor/hooks.json` and `.claude/settings.json` when wiring changes.
4. **Skills:** install/update under `.agents/skills/` + `skills-lock.json`. Claude entries are symlinks into `.agents/skills/` (except Cursor-only `skills-update`). Project-owned skills (`pnpm`, `ui-ux-design-best-practices`, `monorepo-agent-setup`, `review-*`) live once under `.agents/skills/`.
5. **Review skills:** edit `.agents/skills/review*/SKILL.md` (self-contained; Claude via symlink). Cursor [`.cursor/commands/`](../../../.cursor/commands/) stay thin wrappers to those skills.
6. **MCP:** keep [`.mcp.json`](../../../.mcp.json) and [`.cursor/mcp.json`](../../../.cursor/mcp.json) server lists aligned (`type: "http"` on HTTP servers).
7. **Nested guides:** update `AGENTS.md`; keep `CLAUDE.md` as `@AGENTS.md` + Claude-only bullets.

## Agent guides (apps / packages)

| Focus | Guide |
|-------|-------|
| pnpm workspaces | `.agents/skills/pnpm/SKILL.md` |
| React SPA | `apps/front-app/AGENTS.md` |
| HTTP gateway | `apps/worker-api/AGENTS.md` |
| Zod DTOs | `packages/dtos-common/AGENTS.md` |
| Shared value sets | `packages/enums-common/AGENTS.md` |
| TS presets | `packages/typescript-config/AGENTS.md` |
| Agent hooks | `hooks/AGENTS.md` |

## Inventory (quick)

- **Rules:** 17 mirrored basenames (only `core/guardrails` always-on).
- **Subagents:** `ci-verifier`, `docs-researcher`, `test-runner`.
- **Cursor hooks:** `beforeShellExecution` (git guards, `failClosed`), `afterFileEdit` (format/lint), `sessionStart`.
- **Claude hooks:** PreToolUse Bash (same git guards), PostToolUse Edit\|Write (format/lint), InstructionsLoaded.
- **MCP:** `cloudflare-docs`, `context7` (project). Keep the Cursor Cloudflare **plugin** disabled unless you need account-scoped bindings/builds/observability MCP (those trigger OAuth login); do not double-register Context7 via plugin.
