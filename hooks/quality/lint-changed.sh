#!/usr/bin/env sh
# Purpose: Lint a JS/TS file right after an agent edits it and feed problems back.
# Target: called by check-changed.sh after Cursor afterFileEdit or Claude Edit|Write.
# Canonical location: hooks/quality/ - wired from .cursor/hooks.json and .claude/settings.json.
#
# Exits 2 with oxlint output on stderr when the file has problems. Post-tool
# callers receive feedback, but the completed edit is not rolled back.
#
# Two deliberate choices, both required for the output to match `make ci`:
#   1. oxlint runs FROM THE REPO ROOT on a root-relative path. `.oxlintrc.json`
#      `settings.better-tailwindcss.entryPoint` is resolved against the process
#      CWD, so linting from anywhere else changes the diagnostics.
#   2. `--format=agent` pins the one-line `file:line:col: severity plugin(rule):
#      message help: ...` form. The `default` format renders code frames and a
#      summary footer when stdout is a TTY, which is noise for an agent.

INPUT=$(cat 2>/dev/null || true)
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"

if command -v jq >/dev/null 2>&1; then
  FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null || true)
else
  FILE=$(printf '%s' "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' 2>/dev/null || true)
fi

[ -z "$FILE" ] && exit 0
[ -f "$FILE" ] || exit 0

# Mirror the extension set in format-changed.sh so an edit is never formatted
# but left unlinted. `.d.ts` is generated output - never lint it.
case "$FILE" in
  *.d.ts) exit 0 ;;
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;;
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

# Absolutise both sides, then make FILE relative to ROOT so oxlint can run with
# the repo root as its CWD.
ABS_ROOT=$(cd "$ROOT" 2>/dev/null && pwd) || exit 0
case "$FILE" in
  /*) ABS_FILE="$FILE" ;;
  *) ABS_FILE="$(pwd)/$FILE" ;;
esac
case "$ABS_FILE" in
  "$ABS_ROOT"/*) REL_FILE=${ABS_FILE#"$ABS_ROOT"/} ;;
  # Outside the repo (worktree, symlinked path): nothing sensible to lint.
  *) exit 0 ;;
esac

set -- --format=agent --no-error-on-unmatched-pattern
# An explicit --config also disables nested-config discovery, which is what we
# want: this monorepo has exactly one oxlint config.
[ -f "$ABS_ROOT/.oxlintrc.json" ] && set -- "$@" --config "$ABS_ROOT/.oxlintrc.json"
set -- "$@" "$REL_FILE"

if OUT=$(cd "$ABS_ROOT" && "$OXLINT" "$@" 2>&1); then
  exit 0
fi

printf 'oxlint reported problems in %s:\n%s\n' "$REL_FILE" "$OUT" >&2
exit 2
