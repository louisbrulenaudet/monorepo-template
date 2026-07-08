#!/usr/bin/env sh
# Purpose: Format a JS/TS file right after an agent writes/edits it, so edits stay CI-clean.
# Target: Cursor postToolUse (Write) and Claude Code PostToolUse (Write|Edit|MultiEdit).
# Canonical location: hooks/quality/ — wired from .cursor/hooks.json and .claude/settings.json.
#
# Non-blocking: always exits 0. oxfmt writes in place and honours .gitignore.

INPUT=$(cat 2>/dev/null || true)
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"

if command -v jq >/dev/null 2>&1; then
  FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null || true)
else
  FILE=$(printf '%s' "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' 2>/dev/null || true)
fi

[ -z "$FILE" ] && exit 0
[ -f "$FILE" ] || exit 0

case "$FILE" in
  *.d.ts) exit 0 ;;
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac

OXFMT=""
if [ -x "$ROOT/node_modules/.bin/oxfmt" ]; then
  OXFMT="$ROOT/node_modules/.bin/oxfmt"
elif [ -x "./node_modules/.bin/oxfmt" ]; then
  OXFMT="./node_modules/.bin/oxfmt"
elif command -v oxfmt >/dev/null 2>&1; then
  OXFMT="oxfmt"
fi
[ -z "$OXFMT" ] && exit 0

"$OXFMT" --no-error-on-unmatched-pattern "$FILE" >/dev/null 2>&1 || true
exit 0
