@AGENTS.md

## Claude Code

**Start sessions from the repo root.** `.claude/settings.json` - permission denies, hooks, sandbox - loads only from the starting directory and is **not** inherited by subdirectories, unlike `CLAUDE.md`. A session started in `apps/worker-api/` still loads every instruction file but none of the enforcement.

- The `Edit`/`Write` post-tool hook formats and lints each file you touch and hands back agent-format diagnostics - treat that feedback as authoritative for that file. Act on `pnpm lint:agent` lines directly: location and fix hint are already there, so do not re-read the file to locate the problem.
- Delegate `pnpm run ci` to `verifier` when you do not need the raw diagnostics in context.
- Path-scoped rules in `.claude/rules/` load when you touch a matching file; framework depth lives in skills (`hono`, `tanstack-router`, `tanstack-query`, `workers-best-practices`).
