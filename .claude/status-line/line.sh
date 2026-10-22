#!/usr/bin/env sh
# Claude Code statusLine (session JSON on stdin): one line, lowest-priority segments dropped to fit COLUMNS.

set -u

if ! command -v jq >/dev/null 2>&1; then
  printf 'status line needs jq\n'
  exit 0
fi

DIR=${0%/*}
[ "$DIR" = "$0" ] && DIR=.

INPUT=$(cat 2>/dev/null || true)
[ -z "$INPUT" ] && INPUT="{}"
CWD=$(printf '%s' "$INPUT" | jq -r '.workspace.current_dir // .cwd // empty' 2>/dev/null)
[ -z "${CWD:-}" ] && CWD="${CLAUDE_PROJECT_DIR:-.}"

# Skips optional locks so this never blocks on a concurrent git process.
BRANCH=$(git -C "$CWD" --no-optional-locks branch --show-current 2>/dev/null)
[ -z "$BRANCH" ] && BRANCH=$(git -C "$CWD" --no-optional-locks rev-parse --short HEAD 2>/dev/null)

printf '%s' "$INPUT" | jq -r --arg git_branch "$BRANCH" --arg cols "${COLUMNS:-0}" -f "$DIR/line.jq" 2>/dev/null ||
  printf 'status line: jq failed\n'
