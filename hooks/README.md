# Agent Hooks

Shared shell hooks for **Cursor** and **Claude Code**. Scripts live here; wiring stays in tool-specific config files.

## Layout

```
hooks/
├── git/
│   ├── guard-destructive-git.sh   # Block reset --hard, push --force, etc.
│   └── guard-secret-commit.sh     # Block staging/committing secret files
├── quality/
│   ├── format-changed.sh          # oxfmt after file writes (non-blocking)
│   └── lint-changed.sh            # oxlint after TS writes (exit 2 on errors)
├── logging/
│   ├── session-start.sh           # Cursor sessionStart
│   └── instructions-loaded.sh     # Claude Code InstructionsLoaded
├── logs/                          # Debug output (git-ignored)
├── AGENTS.md                      # Agent guide (Cursor + nested AGENTS.md)
├── CLAUDE.md                      # Claude Code entry
└── README.md                      # This file
```

## Wiring

| Tool | Config file | Runs from |
|------|-------------|-----------|
| Cursor | [`.cursor/hooks.json`](../.cursor/hooks.json) | Project root |
| Claude Code | [`.claude/settings.json`](../.claude/settings.json) | Project root |

Both read JSON on **stdin** and support Claude (`tool_input.*`) and Cursor (flat `command` / `file_path`) shapes.

## When hooks run

| Hook event | Script | Behavior |
|------------|--------|-----------|
| **preToolUse** / PreToolUse (Shell/Bash) | `git/guard-secret-commit.sh` | Exit 2 if secrets would be staged |
| **preToolUse** / PreToolUse (Shell/Bash) | `git/guard-destructive-git.sh` | Exit 2 on destructive git |
| **postToolUse** / PostToolUse (Write) | `quality/format-changed.sh` | Format edited JS/TS in place |
| **postToolUse** / PostToolUse (Write) | `quality/lint-changed.sh` | Lint edited TS; exit 2 feeds agent feedback |
| **sessionStart** (Cursor only) | `logging/session-start.sh` | Append to `logs/session-start.log` |
| **InstructionsLoaded** (Claude only) | `logging/instructions-loaded.sh` | Append to `logs/instructions-loaded.log` |

Exit code **2** blocks the action (permission denied). Other non-zero exits fail open unless `failClosed` is set.

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
