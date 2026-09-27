---
name: monorepo-agent-setup
description: "USE WHEN: editing Cursor/Claude agent config, rules, hooks, skills, MCP, subagents, slash commands, or dual-tree sync; or when asking how Claude vs Cursor instructions are laid out in this monorepo. DO NOT USE WHEN: implementing app features, Workers, or frontend UI unless the task is specifically about agent tooling."
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
| Review workflows | Skills under `.agents/skills/review*` (symlink) | Same skills under `.agents/skills/review*` |
| Stack reviews | `/review-stack` under `.agents/skills/review-stack/` (symlink) - protocol in `SKILL.md`, one companion per dependency in `deps/<dep>.md` | Same |
| Deep skills | Symlinks → [`.agents/skills/`](../../) | [`.agents/skills/`](../../) (source of truth) |
| Nested app guides | `CLAUDE.md` per app/package | `AGENTS.md` per app/package |

- Claude: nested `CLAUDE.md` loads on demand; debug with `tail -f hooks/logs/instructions-loaded.log`.
- Cursor: nested `AGENTS.md` by directory; `.mdc` rules attach via `globs` / `alwaysApply`. Debug: **Customize → Hooks**.
- Rule folders (`core`, `frontend`, `backend`, `contracts`, `quality`, `tests`, `ops`) organize only; scoping is frontmatter (`paths` vs `globs`/`alwaysApply`).

See [`hooks/AGENTS.md`](../../../hooks/AGENTS.md) for hook authoring.

## Content taxonomy (what belongs where)

Put instructions in the layer that matches how often agents need them. Path-scoped rules save context; `alwaysApply` / rules without `paths` cost the same as root `AGENTS.md`.

| Layer | Put here | Examples |
|-------|----------|----------|
| Root [`AGENTS.md`](../../../AGENTS.md) | Always-on project map for almost every task | Overview, worker prefixes, where-to-put, essential pnpm scripts, architecture decision bullets, pointers |
| Path-scoped rules (mirrored `.cursor` / `.claude`) | Only when editing matching files | Ports / `inspector_port` / `strictPort`, wrangler secrets, contract workflow, oxlint style, TSConfig presets |
| Nested app/package `AGENTS.md` | Package-local workflows | `apps/front-app`, `worker-api`, `dtos-common` |
| Skills | Deep / on-demand procedures | `monorepo-agent-setup`, `turborepo`, `hono`, review skills |
| [`README.md`](../../../README.md) | Human-facing docs | Architecture diagram, onboarding, scaffold checklist, human-only `/review-*` list |

Do **not** duplicate path-scoped or linter detail in root `AGENTS.md`. Prefer a one-line pointer to the owning rule, skill, or README.

## Sync policy

When changing agent setup, keep both tools in sync:

1. **Rules:** edit both `.cursor/rules/<cat>/<name>.mdc` and `.claude/rules/<cat>/<name>.md` (remap frontmatter: Cursor `description`/`globs`/`alwaysApply` ↔ Claude `paths`).
2. **Agents:** edit both `.cursor/agents/<name>.md` and `.claude/agents/<name>.md` (keep product-native keys: `model`, `tools`, `readonly`, `color`).
3. **Hooks:** edit scripts only under `hooks/`; update both `.cursor/hooks.json` and `.claude/settings.json` when wiring changes.
4. **Skills:** install/update under `.agents/skills/` + `skills-lock.json` (when present). Claude entries are symlinks into `.agents/skills/` (except Cursor-only `skills-update`). Project-owned skills (`pnpm`, `ui-ux-design-best-practices`, `monorepo-agent-setup`, `privileged-legal-data`, `front-vitest`, `run-app`, `review-*`) live once under `.agents/skills/`.
5. **Review skills:** edit `.agents/skills/review*/SKILL.md` (Claude via symlink). Two families: **dimension** reviews (`review`, `review-architecture`, `review-ci`, `review-code-quality`, `review-configuration`, `review-performance`, `review-security`, `review-seo`, `review-tests`, `review-ui`) and the **stack review** `review-stack`: its protocol (ground truth, evidence bar, accepted choices, severity, verification, output, follow-up) lives once in `review-stack/SKILL.md`, and each dependency is one companion `review-stack/deps/<dep>.md` whose frontmatter is the registry (`id`, `summary`, `families`, `packages`, `paths`) and whose body carries Ground truth, Scope, Probe, Axes, Critical when, Overlaps, Accepted. `review-stack/scripts/preflight.mjs` resolves selectors (including `changed`) and prints the version snapshot from that registry. To cover a new tool, add one companion; never a new skill directory or table row. The stack review runs from the main thread (no `context: fork`) because it fans out one subagent per dependency; it writes no files. Both families share the Critical / Improvements / Optional output contract and `disable-model-invocation: true` - human-only. The stack review mandates ground-truth retrieval (installed documentation MCP collector → direct web fetch restricted to official domains → official changelogs) before suggestions and cites a source per finding. `review-*` and `pnpm` set `disable-model-invocation: true`, so **only a human can run them** - they cannot be preloaded into a subagent's `skills:` field or invoked through the Skill tool. Keep it that way for the whole-repo review deep dives; do not add it to a skill an agent needs. `privileged-legal-data` is deliberately **model-invocable** for exactly that reason: it is the preloadable checklist behind `guardrails.md` → "Privileged client data". When adding a security review agent later, preload that skill rather than copying its contents into the agent description. `front-vitest` is also model-invocable: the thin `tests/front-react` rule points at it for DOM/RTL/Router harness depth. `review-tests` is the audit half of the test value bar: the authoring gate and junk patterns live once in the `quality/testing` rule, which the skill reads rather than restates.
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

- **Rules:** mirrored basenames (`core/guardrails` and `quality/comments` always-on); `tests/` holds vitest + hono-workers + front-react (DOM/RTL depth in skill `front-vitest`); `ops/` holds `ci`, `cd`, `previews`, `release`. No `drizzle-orm` rule until a DB-owning worker lands.
- **Subagents:** `explorer`, `planner`, `verifier`, `bundle-analyzer`, `docs-researcher`.
- **Skills:** mirrored basenames plus the `/review-stack` stack review with one companion per dependency (see Review skills above); deep skills (`react-doctor`, `turborepo`, `wrangler`, TanStack family) are consulted as context by their matching companion.
- **Cursor hooks:** `beforeShellExecution` (git guards, `failClosed`), `afterFileEdit` (format/lint), `sessionStart`.
- **Claude hooks:** PreToolUse Bash (same git guards), PostToolUse Edit\|Write (format/lint), InstructionsLoaded.
- **MCP:** documentation MCP servers registered in `.mcp.json` (currently `context7` - a library-docs collector - and `cloudflare-docs`). Keep the Cursor Cloudflare **plugin** disabled unless you need account-scoped bindings/builds/observability MCP (those trigger OAuth login); do not double-register a documentation collector via plugin.
