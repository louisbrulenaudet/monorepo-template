@AGENTS.md

## Claude Code

- Run `make ci` before finishing any code change.
- During iteration, `make lint-agent` (or `pnpm lint:agent`) emits OXC's `--format=agent` diagnostics (`file:line:col: severity plugin(rule): message help: …`) - a compact, machine-readable form for fast triage. Read-only, no auto-fix; still run `make ci` before finishing.
- Use plan mode for multi-file or architectural changes.
- Path-scoped rules in `.claude/rules/` apply when editing matching files - see `/memory` to verify what loaded.
- Framework depth: use skills (`hono`, `tanstack-router`, `tanstack-query`, `workers-best-practices`).
