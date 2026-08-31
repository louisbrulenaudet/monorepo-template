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
| Dependency-scoped reviews | `/review-<dep>` skills under `.agents/skills/review-<dep>/` (symlink) - one per dev dependency (claude-code, cursor, vite, oxc, typescript, turborepo, pnpm, wrangler, hono, tailwind, vitest, tanstack-router, tanstack-query, react, zod, knip, syncpack) | Same |
| Deep skills | Symlinks → [`.agents/skills/`](../../) | [`.agents/skills/`](../../) (source of truth) |
| Nested app guides | `CLAUDE.md` per app/package | `AGENTS.md` per app/package |

- Claude: nested `CLAUDE.md` loads on demand; debug with `tail -f hooks/logs/instructions-loaded.log`.
- Cursor: nested `AGENTS.md` by directory; `.mdc` rules attach via `globs` / `alwaysApply`. Debug: **Customize → Hooks**.
- Rule folders (`core`, `frontend`, `backend`, `contracts`, `quality`, `tests`, `ops`) organize only; scoping is frontmatter (`paths` vs `globs`/`alwaysApply`).
- Vite config rule: `.claude/rules/frontend/vite-config.md` ↔ `.cursor/rules/frontend/vite-config.mdc` - `apps/front-*/vite.config.ts` only.
- Tailwind rule: `.claude/rules/frontend/tailwind.md` ↔ `.cursor/rules/frontend/tailwind.mdc` - `apps/front-*/src/**/*.{ts,tsx,css}`, `apps/front-*/index.html`.
- Ports rule: `.claude/rules/backend/ports.md` ↔ `.cursor/rules/backend/ports.mdc` - `wrangler.jsonc`, app `package.json`, `front-*/vite.config.ts`.
- TSConfig rule: `.claude/rules/quality/typescript-config.md` ↔ `.cursor/rules/quality/typescript-config.mdc` - `packages/typescript-config/**`, `**/tsconfig*.json`.
- Vitest shared-config rule: `.claude/rules/quality/vitest-config.md` ↔ `.cursor/rules/quality/vitest-config.mdc` - `packages/vitest-config/**`.
- Turbo rule: `.claude/rules/core/turborepo.md` ↔ `.cursor/rules/core/turborepo.mdc` - `**/turbo.json`, `.github/workflows/**`.

See [`hooks/AGENTS.md`](../../../hooks/AGENTS.md) for hook authoring. Full layout and sync policy: this skill.

## Content taxonomy (what belongs where)

Put instructions in the layer that matches how often agents need them. Path-scoped rules save context; `alwaysApply` / rules without `paths` cost the same as root `AGENTS.md`.

| Layer | Put here | Examples |
|-------|----------|----------|
| Root [`AGENTS.md`](../../../AGENTS.md) | Always-on project map for almost every task | Overview, architecture diagram, worker prefixes, where-to-put, essential pnpm scripts, architecture decision bullets, pointers |
| Path-scoped rules (mirrored `.cursor` / `.claude`) | Only when editing matching files | Ports / `inspector_port` / `strictPort`, wrangler secrets, contract workflow, oxlint style, TSConfig presets |
| Nested app/package `AGENTS.md` | Package-local workflows | `apps/front-app`, `worker-api`, `dtos-common` |
| Skills | Deep / on-demand procedures | `monorepo-agent-setup`, `turborepo`, `hono`, review skills |
| [`README.md`](../../../README.md) | Human-facing docs | Full port registry, copy-from-existing scaffold checklist |

Do **not** duplicate path-scoped or linter detail in root `AGENTS.md`. Prefer a one-line pointer to the owning rule, skill, or README.

## Sync policy

When changing agent setup, keep both tools in sync:

1. **Rules:** edit both `.cursor/rules/<cat>/<name>.mdc` and `.claude/rules/<cat>/<name>.md` (remap frontmatter: Cursor `description`/`globs`/`alwaysApply` ↔ Claude `paths`).
2. **Agents:** edit both `.cursor/agents/<name>.md` and `.claude/agents/<name>.md` (keep product-native keys: `model`, `tools`, `readonly`, `color`).
3. **Hooks:** edit scripts only under `hooks/`; update both `.cursor/hooks.json` and `.claude/settings.json` when wiring changes.
4. **Skills:** install/update under `.agents/skills/` + `skills-lock.json` (when present). Claude entries are symlinks into `.agents/skills/` (except Cursor-only `skills-update`). Project-owned skills (`pnpm`, `ui-ux-design-best-practices`, `monorepo-agent-setup`, `privileged-legal-data`, `front-vitest`, `react-doctor`, `review-*`) live once under `.agents/skills/`.
5. **Review skills:** edit `.agents/skills/review*/SKILL.md` (self-contained; Claude via symlink). Two families: **dimension** reviews (`review`, `review-architecture`, `review-ci`, `review-code-quality`, `review-configuration`, `review-performance`, `review-security`, `review-seo`, `review-ui`) and **dependency-scoped stack reviews** (`review-claude-code`, `review-cursor`, `review-vite`, `review-oxc`, `review-typescript`, `review-turborepo`, `review-pnpm`, `review-wrangler`, `review-hono`, `review-tailwind`, `review-vitest`, `review-tanstack-router`, `review-tanstack-query`, `review-react`, `review-zod`, `review-knip`, `review-syncpack`). Both share the same output contract (Critical / Improvements / Optional plan) and `disable-model-invocation: true` - human-only. Dependency-scoped skills mandate ground-truth retrieval (installed documentation MCP collector → direct web fetch restricted to official domains → official changelogs) before suggestions; no hard-coded doc URLs, cite sources per finding. `review-*` and `pnpm` set `disable-model-invocation: true`, so **only a human can run them** - they cannot be preloaded into a subagent's `skills:` field or invoked through the Skill tool. Keep it that way for the whole-repo review deep dives; do not add it to a skill an agent needs. `privileged-legal-data` is deliberately **model-invocable** for exactly that reason: it is the preloadable checklist behind `guardrails.md` → "Privileged client data". When adding a security review agent later, preload that skill rather than copying its contents into the agent description. `front-vitest` is also model-invocable: the thin `tests/front-react` rule points at it for DOM/RTL/Router harness depth.
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

- **Rules:** 25 mirrored basenames (`core/guardrails` and `quality/comments` always-on); `tests/` holds vitest + hono-workers + front-react (DOM/RTL depth in skill `front-vitest`); `ops/` holds `ci` + `cd`. No `drizzle-orm` rule until a DB-owning worker lands.
- **Subagents:** `verifier`, `bundle-analyzer`, `docs-researcher`.
- **Skills:** 26 mirrored basenames plus 17 dependency-scoped `/review-<dep>` stack reviews (see Review skills above); deep skills (`react-doctor`, `turborepo`, `wrangler`, TanStack family) consulted as context by their matching review skill.
- **Cursor hooks:** `beforeShellExecution` (git guards, `failClosed`), `afterFileEdit` (format/lint), `sessionStart`.
- **Claude hooks:** PreToolUse Bash (same git guards), PostToolUse Edit\|Write (format/lint), InstructionsLoaded.
- **MCP:** documentation MCP servers registered in `.mcp.json` (currently `context7` - a library-docs collector - and `cloudflare-docs`). Keep the Cursor Cloudflare **plugin** disabled unless you need account-scoped bindings/builds/observability MCP (those trigger OAuth login); do not double-register a documentation collector via plugin.
