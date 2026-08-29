# Agent Hooks

Shared shell hooks for **Cursor** and **Claude Code**. Scripts live here; wiring stays in tool-specific config files.

These hooks run in the **AI agent loop** only. They do **not** run on a normal human `git commit` - that is [Vite+](https://viteplus.dev/guide/commit-hooks) (`.vite-hooks/pre-commit`). See the root README diagram that contrasts both systems.

## Layout

```
hooks/
├── git/
│   ├── lib/
│   │   └── parse-command.sh       # Quote-aware command parser (sourced, not run)
│   ├── guard-destructive-git.sh   # Block reset --hard, push --force, etc.
│   └── guard-secret-commit.sh     # Block staging/committing secret files
├── security/
│   └── guard-secret-content.sh    # Block writes whose CONTENT holds a credential
├── quality/
│   ├── check-changed.sh           # Sequential format-then-lint entry point
│   ├── format-changed.sh          # oxfmt after file edits (non-blocking)
│   └── lint-changed.sh            # oxlint after TS edits (exit 2 on errors)
├── logging/
│   ├── session-start.sh           # Cursor sessionStart
│   └── instructions-loaded.sh     # Claude Code InstructionsLoaded
├── logs/                          # Debug output (git-ignored, size-capped)
├── AGENTS.md                      # Agent guide (Cursor + nested AGENTS.md)
├── CLAUDE.md                      # Claude Code entry
└── README.md                      # This file
```

## Wiring

| Tool | Config file | Runs from |
|------|-------------|-----------|
| Cursor | [`.cursor/hooks.json`](../.cursor/hooks.json) | Project root |
| Claude Code | [`.claude/settings.json`](../.claude/settings.json) | Project root |

```mermaid
flowchart LR
  subgraph config [Tool_config]
    Cursor[".cursor/hooks.json"]
    Claude[".claude/settings.json"]
  end
  subgraph scripts [hooks]
    Git["git/"]
    Quality["quality/"]
    Logging["logging/"]
  end
  Cursor --> Git
  Cursor --> Quality
  Cursor --> Logging
  Claude --> Git
  Claude --> Quality
  Claude --> Logging
```

Both read JSON on **stdin** and support Claude (`tool_input.*`) and Cursor (flat `command` / `file_path`) shapes. `jq` is **required**, not optional.

Permission JSON on stdout is emitted **only for Cursor**, gated on `CURSOR_PROJECT_DIR`. Claude Code ignores stdout on exit 2 and never injects it on `PreToolUse`, so the guards keep stdout silent there - see [AGENTS.md](AGENTS.md#output-contract) for why that matters.

## When hooks run

| Hook event | Script | Behavior |
|------------|--------|-----------|
| **beforeShellExecution** (Cursor) / PreToolUse Bash (Claude) | `git/guard-secret-commit.sh` | Exit 2 if secrets would be staged |
| **beforeShellExecution** (Cursor) / PreToolUse Bash (Claude) | `git/guard-destructive-git.sh` | Exit 2 on destructive git |
| **PreToolUse Edit\|Write** (Claude only) | `security/guard-secret-content.sh` | Exit 2 if the written content holds a credential |
| **afterFileEdit** (Cursor) / PostToolUse Edit\|Write (Claude) | `quality/check-changed.sh` | Format, then lint edited JS/TS sequentially |
| **sessionStart** (Cursor only) | `logging/session-start.sh` | Append to `logs/session-start.log` |
| **InstructionsLoaded** (Claude only, async) | `logging/instructions-loaded.sh` | Append to `logs/instructions-loaded.log` |

Exit code **2** blocks a pre-shell action. On a post-edit event it only feeds the error back to the agent; it cannot roll back the completed edit. **Exit 1 never blocks anything** - the guards are written so that every failure path reaches exit 2.

The guards **fail closed**: a missing `jq`/`awk`, an unreadable parser library, a crash or a signal denies the command with a `guard fault:` reason rather than silently allowing it. Cursor additionally sets `failClosed: true`.

## Manual test (before wiring)

```bash
# Should deny (exit 2), reason on stderr, stdout silent
echo '{"tool_input":{"command":"git push --force"}}' | sh hooks/git/guard-destructive-git.sh; echo "exit=$?"

# Should allow (exit 0)
echo '{"tool_input":{"command":"git status"}}' | sh hooks/git/guard-destructive-git.sh; echo "exit=$?"

# Cursor mode additionally prints a JSON verdict on stdout
echo '{"command":"git push --force"}' | CURSOR_PROJECT_DIR=$PWD sh hooks/git/guard-destructive-git.sh

# Regression: a redirect must not fault the parser. Should allow (exit 0)
echo '{"tool_input":{"command":"git add foo.txt 2>&1"}}' | sh hooks/git/guard-secret-commit.sh; echo "exit=$?"

# ...and the same command naming a secret must still deny (exit 2)
echo '{"tool_input":{"command":"git add .env 2>&1"}}' | sh hooks/git/guard-secret-commit.sh; echo "exit=$?"
```

## Debugging

```bash
# Cursor session events
tail -f hooks/logs/session-start.log

# Claude instruction loading
tail -f hooks/logs/instructions-loaded.log

# Cursor hook output channel
# Customize → Hooks
```

## Adding a hook

1. Add the script under the right subfolder (`git/`, `quality/`, `logging/`).
2. `chmod +x hooks/<category>/<script>.sh`
3. Register in **both** [`.cursor/hooks.json`](../.cursor/hooks.json) and [`.claude/settings.json`](../.claude/settings.json) when the hook applies to both tools.
4. Update [AGENTS.md](AGENTS.md) and this README.

See [AGENTS.md](AGENTS.md) for authoring conventions and guardrail alignment.
