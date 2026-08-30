@AGENTS.md

## Claude Code

**Start sessions from the repo root.** `.claude/settings.json` - permission denies, hooks, sandbox - loads only from the starting directory and is **not** inherited by subdirectories, unlike `CLAUDE.md`. A session started in `apps/worker-api/` still loads every instruction file but none of the enforcement.

- Reach for `pnpm lint:agent`, never bare `oxlint`. It pins `--format=agent`: one line per diagnostic, `file:line:col: severity plugin(rule): message help: …`. Act on those lines directly - location and fix hint are already there, so do not re-read the file to locate the problem. Read-only, no auto-fix.
- Never `cd` into a package to lint. Lint/format are whole-repo by design - see **Scoping** in `AGENTS.md` for why, and pass a path to narrow: `pnpm --filter=front-app run lint`.
- The `Edit`/`Write` post-tool hook already formats and lints each file you touch and hands back agent-format diagnostics. Treat that feedback as authoritative for that file.
- Run `pnpm run ci` before finishing any code change. Advisory - nothing enforces it. Delegate it to `verifier` when you do not need the raw diagnostics in context.
- Use plan mode for multi-file or architectural changes. Delegation table and traps: **Agent tooling** in `AGENTS.md`. Claude-specific: the built-in `Explore`/`Plan` do **not** load this file or `.claude/rules/`, so prefer the local `explorer` and `planner` agents, which carry that grounding in their own prompts; if you use a built-in anyway, restate the binding constraints in the prompt.
- Path-scoped rules in `.claude/rules/` load when you touch a matching file.
- Framework depth lives in skills: `hono`, `tanstack-router`, `tanstack-query`, `workers-best-practices`.
