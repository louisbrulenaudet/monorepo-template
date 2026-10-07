# Agent Hooks Instructions

## Overview

The `hooks/` directory holds **shared agent hook scripts** for Cursor and Claude Code. Hooks observe or control the agent loop: block unsafe git commands, format/lint after edits, and log debug events. Scripts are tool-agnostic; wiring lives in [`.cursor/hooks.json`](../.cursor/hooks.json) and [`.claude/settings.json`](../.claude/settings.json).

Guardrails enforced here mirror rule [`core/guardrails`](../.claude/rules/core/guardrails.md).

## Structure

`lib/` sourced helpers, never executed (`guard.sh`: payload, verdicts, fail-closed trap, the segment loop; `parse-command.sh`: the quote-aware parser) · `git/` shell-command guards · `security/` content guards (Claude only) · `quality/` post-edit format + lint and the stop gate · `session/` session-start context · `logging/` debug logs · `tests/run.sh` (`pnpm hooks:test`) · `logs/` git-ignored runtime output, size-capped. Per-script triggers: [Hook Behavior Summary](#hook-behavior-summary).

## Where to Change Things

| Task | Location |
|------|----------|
| Block a new git pattern | `git/guard-destructive-git.sh` or `git/guard-secret-commit.sh`, plus a deny and an allow case in `tests/run.sh` |
| Change how a command is parsed | `lib/parse-command.sh` |
| Change how every guard reads input or reports a verdict | `lib/guard.sh` |
| Add a credential pattern for written content | `security/guard-secret-content.sh` |
| Protect another generated artifact from hand-edits | `security/guard-generated-files.sh` |
| Change format/lint behavior | `quality/check-changed.sh` |
| Change what runs before the agent may finish | `quality/stop-gate.sh` |
| Warn the agent about the checkout at session start | `session/session-context.sh`, plus a case in `tests/run.sh` |
| Add Cursor hook wiring | [`.cursor/hooks.json`](../.cursor/hooks.json) |
| Add Claude hook wiring | [`.claude/settings.json`](../.claude/settings.json) → `hooks` |
| Instruction-load log | `logging/instructions-loaded.sh` → `hooks/logs/` |
| Human overview | [README.md](README.md) |

## Wiring

Paths in `.cursor/hooks.json` and `.claude/settings.json` are **relative to the repo root** (e.g. `hooks/git/guard-secret-commit.sh`).

## Authoring Conventions

- **Shebang**: `#!/usr/bin/env sh` - POSIX shell. `jq` is **required** (the old `sed` fallback was removed: it left JSON escapes intact, so `-m \"note about .env.local\"` re-split into words and produced false denials).
- **Project root**: `ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"`
- **JSON input**: read stdin; support both `.tool_input.command` (Claude) and `.command` (Cursor `beforeShellExecution`).
- **Blocking**: exit `2`. **Never exit `1`** - a non-zero code other than 2 is a *non-blocking* error in Claude Code, so the action proceeds. Every failure path must reach exit 2.
- **Post-tool feedback**: exit `2` reports lint problems but cannot undo an edit that already succeeded.
- **Quality/logging failures**: fail open so unavailable developer tooling does not wedge normal workflows.
- **Filenames**: kebab-case under category folders. `lib/` holds sourced helpers, which are not executable and are never wired to an event.
- **No apostrophes in comments inside `$( ... )`**: macOS `/bin/sh` is bash 3.2 and treats one as an opening quote. For the same reason, keep `case` statements out of command substitutions - put classification in a top-level function.

### Output contract

The git guards serve two harnesses with incompatible expectations, so the JSON is gated on which harness invoked them:

| | Claude Code | Cursor |
|---|---|---|
| Signal | exit `2`, reason on **stderr** | exit `2` **and** a JSON verdict on **stdout** |
| stdout | **silent** | `{"permission":"allow"}` / `{"permission":"deny",...}` |
| Detected via | `CLAUDE_PROJECT_DIR` | `CURSOR_PROJECT_DIR` (never set by Claude Code) |

Claude Code **ignores stdout entirely on exit 2** and does not inject it on `PreToolUse`. Emitting the Cursor JSON unconditionally would make the block depend on Claude Code tolerating unknown JSON keys - behavior that is not documented, and that on builds before v2.1.214 turned an exit-2-plus-invalid-JSON hook into a *non-blocking* error that let the command run. Gating the JSON removes that dependency instead of relying on it.

### Failure semantics: guards fail CLOSED

A guard that cannot evaluate must not wave a command through. Missing `jq`/`awk`, an unreadable `lib/guard.sh` or `lib/parse-command.sh`, a crash or a signal all deny with a `guard fault:` reason. Consequences to respect when editing:

- Each guard checks that `lib/guard.sh` is readable with shell builtins only (`printf`, `${0##*/}`) before sourcing it, and `guard.sh` installs the `trap` before it reads the payload or sources the parser, so a broken `PATH` still yields exit 2 rather than exit 1.
- A syntax error in a guard or in the library **denies every Bash command** until it is fixed. `pnpm hooks:test` (inside `pnpm run check` and `pnpm run ci`) runs `sh -n` on every script plus the regression table in `tests/run.sh`.
- **A harness timeout is the one fail-open path on Claude Code.** Per the hooks reference, a timed-out `PreToolUse` command hook does not block: the call continues through the normal permission flow. No trap can catch that, because the harness stops waiting rather than signaling the script. Cursor is covered by `failClosed: true` in `.cursor/hooks.json`. The guards run in ~35 ms against a 10 s budget, so the realistic trigger is a hung `git add --dry-run` / `git status` inside `guard-secret-commit.sh`. Keep the timeout at 10 s: a larger value does not close the gap, it only makes a stall longer. The backstops are the `permissions.ask` prefix rules for the common destructive git forms, `permissions.deny`, and the sandbox. Those rules never prompt in normal use, because `PreToolUse` denies before the permission check runs.
- **Parser functions must never return a non-zero status.** Guards call them as bare assignments (`gc_segs=$(pc_segments "$1")`), where `set -e` promotes that status to a guard fault - a *silent* denial of a legitimate command, not a syntax error you would notice. This is why `pc_operands` ends in an explicit `return 0`; a trailing `[ $# -gt 0 ] && shift` would otherwise fail whenever its value-taking token is last. Regression case: `git add foo.txt 2>&1` (segmentation splits at the `&`, leaving a bare `2>`) must **allow**.

Empty or absent stdin still **allows**: no payload is not evidence of wrongdoing.

### Matching discipline

Command classification is **parsed, never substring-matched**. `lib/parse-command.sh` splits on unquoted separators, identifies the segment's command word, extracts the git subcommand, and yields only pathspec operands. Secret paths are matched on the **basename** with anchored patterns.

This is not stylistic. The previous implementation used `case $CMD in *git*add*|*git*commit*)` plus a scan of every whitespace token, which denied `git commit -m "document .env.local setup"`, `git add config.env.ts`, and any command that merely *named* `guard-secret-commit.sh` - that path contains `git` followed by `commit`. When adding a rule, extend the parser or the anchored pattern list; do not add a substring test.

Unquoted backticks and `$( … )` split segments like any separator, and `guard_check` re-parses the payload of `eval …` and `sh`/`bash`/`zsh`/`dash`/`ksh -c "…"` (up to 3 levels, deeper denies). Known limits, by design: the guards do not see a substitution inside double quotes, heredocs, base64-decoded pipelines, shell aliases, `xargs` reading stdin, or `--pathspec-from-file`. Separators inside quotes are correctly ignored; a newline inside a quoted argument is folded to a space. `permissions.deny` and the sandbox are the layers that do not depend on parsing.

## Hook Behavior Summary

| Script | Trigger | Exit 2 when |
|--------|---------|-------------|
| `git/guard-secret-commit.sh` | Cursor `beforeShellExecution`; Claude PreToolUse Bash | Secret path named, or in the set `git add --dry-run` (or `commit -a`) would stage |
| `git/guard-destructive-git.sh` | Cursor `beforeShellExecution`; Claude PreToolUse Bash | reset --hard, push --force, checkout --, etc. |
| `quality/check-changed.sh` | Cursor `afterFileEdit`; Claude PostToolUse Edit\|Write | oxlint reports problems on `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs`/`.cjs` (never `.d.ts`); oxfmt runs first and never blocks |
| `security/guard-secret-content.sh` | Claude PreToolUse Edit\|Write | written content matches a high-signal credential pattern |
| `security/guard-generated-files.sh` | Claude PreToolUse Edit\|Write | the target is a generated artifact (`.cloudflare/**` - cf Build Output, `Env` types, local dev state - `routeTree.gen.ts`, `CHANGELOG.md`, `pnpm-lock.yaml`, `dist/**`, `build/**`) - a hook rather than an `Edit(...)` deny, because those denies also blocked the generators inside the sandbox. For the same reason there are deliberately no `Read(...)` denies on `coverage/**`, `*.tsbuildinfo`, or `*.map` (tsc incremental builds and the cf source-map upload read them) |
| `lib/guard.sh` | sourced by every guard | n/a - owns the verdict helpers and the fail-closed trap |
| `lib/parse-command.sh` | sourced by `guard_command` (git guards) | n/a - defines functions, never exits |
| `quality/stop-gate.sh` | Cursor `stop`; Claude Stop | the diff changed since the last check and lint, format, syncpack, or `check-types --affected` fails. Cursor gets a `followup_message` instead of exit 2 |
| `session/session-context.sh` | Cursor sessionStart; Claude SessionStart | never - prints context (Claude stdout, Cursor `additional_context`) only when something is wrong: a missing or stale install, a missing `apps/*/.cloudflare/types/index.d.ts` (apps with a `types` script; no staleness check, because cf rewrites the file only when its content changes), a dev port already bound |
| `logging/instructions-loaded.sh` | Claude InstructionsLoaded (async) | never - this event ignores the exit code |

### Stop gate

`quality/stop-gate.sh` runs the fast static tier plus `check-types --affected` when the agent tries to finish, so a broken diff is caught in the same turn instead of by the user. Four constraints hold it in shape:

- **One enforced retry per turn.** It exits 0 when Claude sets `stop_hook_active` or Cursor's `loop_count` is above 0 (`loop_limit: 1` in `.cursor/hooks.json`), so an unfixable failure cannot trap the agent in a loop.
- **Keyed on the tree state, pass or fail.** The fingerprint (`git diff HEAD` plus untracked paths and contents) is stored per session under `$TMPDIR`, so a clean turn costs about 100 ms and an unchanged failing tree - often the user's own uncommitted work - is reported once, not on every later turn.
- **`//#hooks:test` stays out of it.** The hook suite runs this script; including it would let a broken fixture recurse into the real checkout (it did once, when `mktemp` fell back to an unwritable default and the scratch path came back empty).
- **Fails open** without `jq`, outside a git work tree, or when `node_modules/.bin/turbo` is missing, like the other quality hooks. Root `//#` tasks drop out of `--affected` when only workspace files change, which is why the type check is a second, affected-scoped `turbo run`.

### Content guard

`security/guard-secret-content.sh` is the other direction of the path-based `permissions.deny` rules: it catches a real key pasted into an ordinary source file. Three constraints hold it in shape:

- **`PreToolUse`, never `PostToolUse`.** A post-edit hook cannot undo the write - the credential would already be on disk, in the editor buffer, and in any backup. Blocking beforehand is the only point at which it never lands.
- **Only high-signal literal prefixes** (`AKIA`, private-key blocks, `ghp_`, `sk-ant-`, ...). There is deliberately no entropy or `password = ...` heuristic, and no bare Cloudflare-token shape: an earlier audit found that over-broad matching denied legitimate edits (minified JS, content hashes, base64), and a false denial on every edit is worse than the gap.
- **The reason names the pattern and line numbers only.** The matched text is never echoed, so the secret is not copied into the transcript, the debug log, or any hook log.

### OXC invariants for `quality/` hooks

`check-changed.sh` formats code plus JSON/JSONC/CSS/Markdown, then lints only JS/TS-family code. The lint step holds four constraints that must not be relaxed:

- **Runs oxlint from the repo root** on a root-relative path, and gives `--config` a root-relative path too. `.oxlintrc.json` resolves `settings.better-tailwindcss.entryPoint` against the process CWD, so linting from anywhere else changes the diagnostics and diverges from `pnpm run ci`; and an **absolute** `--config` stops the `overrides[].files` globs matching, which reports every PascalCase component under `apps/front-*/src/**/*.tsx` as a `unicorn/filename-case` violation.
- **Exports `SYNCKIT_TIMEOUT=120000` by default.** Tailwind canonicalization starts a sync worker that can exceed its 30-second default on low-power development machines. The post-edit hook `timeout` is therefore `150` in both `.claude/settings.json` and `.cursor/hooks.json`: at the old `30`, the harness killed the hook before this budget ever applied, and a timed-out `PostToolUse` hook drops its diagnostics silently.
- **Passes `--format=agent`** so output is one line per diagnostic (`file:line:col: severity plugin(rule): message help: …`) instead of the TTY-dependent code frames the `default` format renders.
- **Passes `--no-error-on-unmatched-pattern`.** Without it, editing a file that `ignorePatterns` or `.gitignore` excludes (`*.gen.ts`, `.cloudflare/**`) makes oxlint exit 1 with "No files found to lint", which the hook would report to the agent as a lint failure that does not exist.

The script discards the **format** exit status and lets the **lint** exit status become its own, so a formatter hiccup can never pre-empt the diagnostics the agent needs. It deliberately does not use `set -e`.

## Debugging

| Log | Command |
|-----|---------|
| Claude instruction load | `tail -f hooks/logs/instructions-loaded.log` - one line per loaded file with `path`, `reason` (`session_start`, `path_glob_match`, `nested_traversal`, `include`, `compact`), `memory_type`, and the `trigger` file for path-scoped rules |
| Last Stop gate run | `$TMPDIR/claude-stop-gate-<session>.log` |
| Cursor hook errors | Customize → Hooks output channel |

The log rotates once past 256 KB (`*.log.1`), so `hooks/logs/` stays bounded. The `InstructionsLoaded` handler is `"async": true` - it is debug telemetry that enforces nothing, and this event ignores hook exit codes, so it must not sit on the critical path.

## Contribution

- Edit scripts only under `hooks/` - do not duplicate under `.cursor/hooks/` or `.claude/hooks/`.
- When adding a hook, update [`.cursor/hooks.json`](../.cursor/hooks.json), [`.claude/settings.json`](../.claude/settings.json) (if applicable), [README.md](README.md), and this file.
- Align new guards with [guardrails](../.claude/rules/core/guardrails.md); never weaken secret or destructive-git protection without explicit user approval.
- `chmod +x` new scripts before committing. Files under `lib/` are sourced, not executed, and stay non-executable.
- Run `pnpm hooks:test` after touching a guard, and add a deny case and an allow case for every new rule: a syntax error there denies **every** Bash command, because the guards fail closed. Keep literal credentials out of `tests/run.sh` (split them across quotes, as the existing cases do), or the content guard blocks the edit.
