#!/usr/bin/env sh
# Purpose: Lint a TypeScript file right after an agent edits it and feed problems back.
# Target: Cursor postToolUse (Write) and Claude Code PostToolUse (Write|Edit|MultiEdit).
# Canonical location: hooks/quality/ — wired from .cursor/hooks.json and .claude/settings.json.
#
# Exits 2 with oxlint output on stderr when the file has problems.

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
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

OXLINT=""
if [ -x "$ROOT/node_modules/.bin/oxlint" ]; then
  OXLINT="$ROOT/node_modules/.bin/oxlint"
elif [ -x "./node_modules/.bin/oxlint" ]; then
  OXLINT="./node_modules/.bin/oxlint"
elif command -v oxlint >/dev/null 2>&1; then
  OXLINT="oxlint"
fi
[ -z "$OXLINT" ] && exit 0

CONFIG="$ROOT/.oxlintrc.json"
if [ -f "$CONFIG" ]; then
  set -- --config "$CONFIG" "$FILE"
else
  set -- "$FILE"
fi

if OUT=$("$OXLINT" "$@" 2>&1); then
  exit 0
fi

printf 'oxlint reported problems in %s:\n%s\n' "$FILE" "$OUT" >&2
exit 2
