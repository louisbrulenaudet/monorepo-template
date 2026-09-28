# Agent Hooks

Shell hooks that run inside the Cursor and Claude Code agent loop: they block destructive git commands, secret commits, credential-bearing writes, and hand-edits to generated files, format and lint every edited file, and gate the diff before the agent finishes. They never run on a human `git commit` - that is the Vite+ pre-commit hook described in the [root README](../README.md).

## Layout

```
hooks/
├── lib/
│   ├── guard.sh                   # Shared guard prelude: payload, verdicts, fail-closed trap (sourced)
│   └── parse-command.sh           # Quote-aware command parser (sourced)
├── git/
│   ├── guard-destructive-git.sh   # Block reset --hard, push --force, etc.
│   └── guard-secret-commit.sh     # Block staging or committing secret files
├── security/
│   ├── guard-generated-files.sh   # Block hand-edits to generated artifacts
│   └── guard-secret-content.sh    # Block writes whose content holds a credential
├── quality/
│   ├── check-changed.sh           # oxfmt (non-blocking), then oxlint (exit 2 on errors), per edited file
│   └── stop-gate.sh               # Fast gate on the diff before the agent finishes
├── session/session-context.sh     # Session-start warnings (missing install, busy ports)
├── logging/instructions-loaded.sh # Debug log of the instruction files Claude Code loads
├── tests/run.sh                   # Regression suite behind pnpm hooks:test
└── logs/                          # Debug output (git-ignored, size-capped)
```

## Wiring

The scripts are shared; each tool wires them in its own config, with paths relative to the repo root: [`.cursor/hooks.json`](../.cursor/hooks.json) for Cursor and [`.claude/settings.json`](../.claude/settings.json) for Claude Code. A hook blocks by exiting 2, and the guards fail closed - a guard that cannot evaluate a command denies it. `jq` is required.

## Testing

```bash
pnpm hooks:test
```

`tests/run.sh` runs `sh -n` on every script, then a table of payloads against each guard, checking the exit code and the output each tool expects. It also runs inside `pnpm run check`, `pnpm run ci`, and GitHub CI. To probe one guard by hand:

```bash
echo '{"tool_input":{"command":"git push --force"}}' | sh hooks/git/guard-destructive-git.sh; echo "exit=$?"
```

## Debugging

```bash
tail -f hooks/logs/instructions-loaded.log   # Which instruction files Claude Code loaded, and why
```

Cursor also shows hook output under **Customize → Hooks**, and the last stop-gate run is logged to `$TMPDIR/claude-stop-gate-<session>.log`.

Agent and contributor detail, including how to add a hook: [AGENTS.md](AGENTS.md).
