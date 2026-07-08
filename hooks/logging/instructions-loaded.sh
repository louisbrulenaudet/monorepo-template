#!/usr/bin/env sh
# Purpose: Record which CLAUDE.md / .claude/rules/*.md files load, to debug memory scoping.
# Target: Claude Code InstructionsLoaded hook (wired from .claude/settings.json).
# Canonical location: hooks/logging/.
#
# Appends each event to hooks/logs/instructions-loaded.log (git-ignored). Non-blocking: always exits 0.

INPUT=$(cat 2>/dev/null || true)
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"
LOG_DIR="$ROOT/hooks/logs"
LOG_FILE="$LOG_DIR/instructions-loaded.log"

mkdir -p "$LOG_DIR" 2>/dev/null || exit 0

LINE=""
if command -v jq >/dev/null 2>&1; then
  LINE=$(printf '%s' "$INPUT" | jq -c '{
    event: .hook_event_name,
    matcher: (.matcher // .trigger // null),
    path: (.tool_input.file_path // .path // .file // null)
  }' 2>/dev/null || true)
fi
[ -z "$LINE" ] && LINE=$(printf '%s' "$INPUT" | tr '\n' ' ')

printf '%s\t%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$LINE" >> "$LOG_FILE" 2>/dev/null || true
exit 0
