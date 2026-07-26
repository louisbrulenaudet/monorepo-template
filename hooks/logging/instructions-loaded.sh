#!/usr/bin/env sh
# Purpose: Record which CLAUDE.md / .claude/rules/*.md files load, to debug memory scoping.
# Target: Claude Code InstructionsLoaded hook (wired from .claude/settings.json).
# Canonical location: hooks/logging/.
#
# Appends each event to hooks/logs/instructions-loaded.log (git-ignored).
#
# Non-blocking: always exits 0. This event ignores the hook exit code anyway, so
# the handler is wired with "async": true and never sits on the critical path.
#
# Debug telemetry only - it enforces nothing. The log is size-capped below so an
# unattended session cannot grow it without bound.

INPUT=$(cat 2>/dev/null || true)
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"
LOG_DIR="$ROOT/hooks/logs"
LOG_FILE="$LOG_DIR/instructions-loaded.log"
LOG_MAX_BYTES=262144

mkdir -p "$LOG_DIR" 2>/dev/null || exit 0

# Single-generation rotation: past the cap, the current log becomes .log.1 and a
# fresh one starts. Two files bound the disk cost at ~512 KB.
if [ -f "$LOG_FILE" ]; then
  SIZE=$(wc -c <"$LOG_FILE" 2>/dev/null || echo 0)
  if [ "${SIZE:-0}" -gt "$LOG_MAX_BYTES" ] 2>/dev/null; then
    mv -f "$LOG_FILE" "$LOG_FILE.1" 2>/dev/null || true
  fi
fi

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
