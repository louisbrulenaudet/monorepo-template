# Agent templates — reviewed, not installed

Each file here is a **complete, copy-paste-ready** Claude Code subagent definition that this
repository deliberately does **not** install yet. They live under `docs/` rather than
`.claude/agents/` so they are version-controlled and reviewable but never discovered, never
delegated to, and never paid for.

The reason is uniform: an agent for a capability the repository does not have is dead weight at
best and a wasted cold start at worst. That mistake was already in this repo once — a `test-runner`
whose trigger ("when a changed workspace defines a test script") could never fire, because no
workspace defines one. Do not repeat it.

## What is installed

`verifier`, `bundle-analyzer`, `docs-researcher` — see **Agent tooling** in the root
[`AGENTS.md`](../../AGENTS.md).

## What is here, and the trigger that should make it real

| Template | Install when | Why not yet |
|---|---|---|
| [`code-reviewer.md`](code-reviewer.md) | `apps/` holds more than two Workers, **or** the four deterministic checks below land in a `make conventions` target so only the judgement calls remain | The bundled `/code-review` skill already does adversarial fresh-context diff review, and it *sees this repo's conventions*: `CLAUDE.md` imports `AGENTS.md` (Worker-prefix table, Decision Checklist) and always-on `guardrails.md` carries "One source of truth" and "Respect the boundaries". At 34 TypeScript source files the context-flood argument is void. |
| [`security-reviewer.md`](security-reviewer.md) | a route handles client or matter data, or auth / tenancy lands | Nothing to review: `apps/worker-api/src/` is `index.ts`, `enums/index.ts`, `routes/health.ts` — one health endpoint, no PII, no auth, no database. An `opus` agent reviewing a health check is pure cost. The knowledge shipped instead, as the `privileged-legal-data` skill plus a `guardrails.md` clause. |
| [`refactorer.md`](refactorer.md) | a Vitest suite exists **and** `make ci` runs it | Two blockers. No qualifying wide-radius refactor exists at this size. And the safety net is missing: with no tests, `make ci` verifies types only, so a mechanical refactor inside an isolated worktree under a `maxTurns` ceiling is behaviourally unverifiable and can strand a half-finished change out of view. |
| [`db-reader.md`](db-reader.md) + [`guard-readonly-query.sh`](guard-readonly-query.sh) | the first D1 / Hyperdrive / Postgres binding is added | No database exists: zero `d1_databases` / `hyperdrive` / `kv_namespaces` bindings in either `wrangler.jsonc`, no `src/db/`, no drizzle code — only `.claude/rules/backend/drizzle-orm.md` anticipating one. |

### The four deterministic checks a `make conventions` target should own

These are the conventions nothing currently machine-checks, and four of the six are pure data
assertions that do not need a model:

1. A non-gateway `worker-*` declares no `routes` and no `workers_dev: true` (RPC-only).
2. A `front-*` declares no `services[]` (the SPA talks HTTP only).
3. No `database_id` repeats across `apps/*/wrangler.jsonc` (one owning Worker per database).
4. A change under `packages/dtos-common/src/api/**` co-touches both `apps/worker-api/**` and
   `apps/front-app/**` (HTTP contracts move together).

The remaining two need judgement and are what `code-reviewer.md` is scoped to: a shared DTO or enum
duplicated inside an app, and HTTP used where service-binding RPC belongs.

## How to install one

1. Copy the file to `.claude/agents/<name>.md` **verbatim** — the frontmatter is first on purpose.
2. Write the Cursor mirror at `.cursor/agents/<name>.md`, remapping frontmatter to Cursor's schema
   (`readonly: true`, `model:`; drop `tools`, `maxTurns`, `color`, `isolation`) per
   § "Sync policy" item 2 in the `monorepo-agent-setup` skill.
3. Delete its row from the table above.
4. Verify against § 9 of the audit: launch it explicitly, confirm `maxTurns` holds, and
   adversarially confirm it cannot write (instruct it to edit a file and watch it fail).

## Two facts that constrain every definition here

- **`tools` is the only least-privilege gate.** `.claude/settings.json` sets
  `permissions.defaultMode: "acceptEdits"`, and a parent `acceptEdits` takes precedence over any
  subagent `permissionMode` — so a `permissionMode: plan` line would be silently ignored. Read-only
  means omitting `Edit`, `Write`, `NotebookEdit` and `Bash`, nothing else.
- **Anything with `isolation: worktree` inherits the `.worktreeinclude` secret copy.** Real
  `.dev.vars` / `.env` files are copied into subagent worktrees. What keeps that safe is
  `worktree.sparsePaths` retaining `.claude`, so the root settings file's deny rules are present
  inside the worktree. Read the comment block in [`.worktreeinclude`](../../.worktreeinclude)
  before installing `refactorer`.
