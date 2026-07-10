@AGENTS.md

## Claude Code

- Run `make ci` before finishing any code change.
- Use plan mode for multi-file or architectural changes.
- Path-scoped rules in `.claude/rules/` apply when editing matching files - see `/memory` to verify what loaded.
- Framework depth: use skills (`hono`, `tanstack-router`, `tanstack-query`, `workers-best-practices`).
