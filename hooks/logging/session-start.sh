#!/usr/bin/env sh
# Purpose: Log Cursor sessionStart events for debugging agent context loading.
# Target: Cursor sessionStart (wired from .cursor/hooks.json).
# Canonical location: hooks/logging/.
#
# Appends each event to hooks/logs/session-start.log (git-ignored). Non-blocking: always exits 0.

INPUT=$(cat 2>/dev/null || true)
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"
LOG_DIR="$ROOT/hooks/logs"
LOG_FILE="$LOG_DIR/session-start.log"

mkdir -p "$LOG_DIR" 2>/dev/null || exit 0

LINE=""
if command -v jq >/dev/null 2>&1; then
  LINE=$(printf '%s' "$INPUT" | jq -c '{
    event: .hook_event_name,
    session_id: (.session_id // null),
    composer_mode: (.composer_mode // null),
    is_background_agent: (.is_background_agent // null)
  }' 2>/dev/null || true)
fi
[ -z "$LINE" ] && LINE=$(printf '%s' "$INPUT" | tr '\n' ' ')

printf '%s\t%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$LINE" >> "$LOG_FILE" 2>/dev/null || true
exit 0
