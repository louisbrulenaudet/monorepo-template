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
| Domain reviews | `/review` under `.agents/skills/review/` (symlink) - protocol in `SKILL.md`, reviewer contract in `reviewer.md`, one file per domain in `domains/<id>.md` | Same |
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
| Path-scoped rules (mirrored `.cursor` / `.claude`) | Only when editing matching files | Ports / `inspectorPort` / `strictPort`, Worker secrets (`bindings.secret()`), contract workflow, oxlint style, TSConfig presets |
| Nested app/package `AGENTS.md` | Package-local workflows | `apps/front-app`, `worker-api`, `dtos-common` |
| Skills | Deep / on-demand procedures | `monorepo-agent-setup`, `turborepo`, `hono`, review skills |
| [`README.md`](../../../README.md) | Human-facing docs | Architecture diagram, onboarding, scaffold checklist, human-only `/review` and `/review-stack` usage |

Do **not** duplicate path-scoped or linter detail in root `AGENTS.md`. Prefer a one-line pointer to the owning rule, skill, or README.

## Sync policy

When changing agent setup, keep both tools in sync:

1. **Rules:** edit both `.cursor/rules/<cat>/<name>.mdc` and `.claude/rules/<cat>/<name>.md` (remap frontmatter: Cursor `description`/`globs`/`alwaysApply` ↔ Claude `paths`). The agent-facing contract (loading, placement, density, twin rules) is rule `core/agent-instructions`, which loads whenever a rule, agent, or `AGENTS.md` is read.
2. **Agents:** edit both `.cursor/agents/<name>.md` and `.claude/agents/<name>.md` (keep product-native keys: `model`, `tools`, `readonly`, `color`).
3. **Hooks:** edit scripts only under `hooks/`; update both `.cursor/hooks.json` and `.claude/settings.json` when wiring changes.
4. **Skills:** install/update under `.agents/skills/` + `skills-lock.json` (when present). Claude entries are symlinks into `.agents/skills/` (except Cursor-only `skills-update`). Project-owned skills (`pnpm`, `ui-ux-design-best-practices`, `monorepo-agent-setup`, `front-vitest`, `run-app`, `cf`, `changeset`, `review`, `review-stack`) live once under `.agents/skills/`.
5. **Review skills:** two skills with the same shape - a protocol in `SKILL.md`, one reference file per unit whose frontmatter is the registry, one parallel subagent per selected unit, verification in the main thread, one reply with `C`/`I`/`O`/`V` IDs (`/review` adds `H` for hardening) answered by `fix` / `accept`. Both run from the main thread (no `context: fork`, because they fan out), write no files, and set `disable-model-invocation: true`: **only a human can run them**, so they cannot be preloaded into a subagent `skills:` field - reviewers get file paths instead. **`/review`** checks our code and design by domain: `review/domains/<id>.md` (`id`, `summary`, `model`, optional `applies_when`; body Ground truth, Scope, Probe, Axes, Critical when, Overlaps, Accepted, optional Extra output), the shared contract `review/reviewer.md` (finding definition, evidence bar, severity, return block), run by the read-only `reviewer` subagent. **`/review-stack`** checks third-party tools against their current docs: `review-stack/deps/<dep>.md` (`id`, `summary`, `families`, `packages`, `paths`), with `review-stack/scripts/preflight.mjs` resolving selectors (including `changed`) and printing the version snapshot; it mandates ground-truth retrieval (documentation MCP collector → official domains → changelogs) and cites a source per finding. To cover a new domain or tool, add one file; never a new skill directory or table row. The `tests` and `simplicity` domains are the audit halves of rules `quality/testing` and `quality/simplicity`, and the `security` domain reads the vendored `security-audit` companions by path (never edits them). `pnpm` also sets `disable-model-invocation: true`; `front-vitest` stays model-invocable because the thin `tests/front-react` rule points at it.
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
| Shared Hono middleware | `packages/hono-middleware/AGENTS.md` |
| TS presets | `packages/typescript-config/AGENTS.md` |
| Agent hooks | `hooks/AGENTS.md` |

## Inventory (quick)

- **Rules:** mirrored basenames (`core/guardrails`, `quality/comments`, and `quality/simplicity` always-on); `tests/` holds hono-workers + front-react (DOM/RTL depth in skill `front-vitest`), while the general Vitest toolchain and the test value bar live in `quality/testing`; `ops/` holds `ci`, `cd`, `previews`, `release`, and `changesets` (writing them; the procedure is skill `changeset`). No `drizzle-orm` rule until a DB-owning worker lands.
- **Subagents:** `explorer`, `planner`, `verifier`, `bundle-analyzer`, `docs-researcher`, `reviewer`.
- **Skills:** mirrored basenames plus the `/review` domain review (one file per domain) and the `/review-stack` stack review (one companion per dependency), see Review skills above; deep skills (`react-doctor`, `turborepo`, `workers-best-practices`, TanStack family) and the project skill `cf` are consulted as context by their matching companion.
- **Cursor hooks:** `beforeShellExecution` (git guards, `failClosed`), `afterFileEdit` (format/lint), `sessionStart`.
- **Claude hooks:** PreToolUse Bash (same git guards), PostToolUse Edit\|Write (format/lint), InstructionsLoaded.
- **MCP:** documentation MCP servers registered in `.mcp.json` (currently `context7` - a library-docs collector - and `cloudflare-docs`). Keep the Cursor Cloudflare **plugin** disabled unless you need account-scoped bindings/builds/observability MCP (those trigger OAuth login); do not double-register a documentation collector via plugin.
