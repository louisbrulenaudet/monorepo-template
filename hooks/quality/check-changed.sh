#!/usr/bin/env sh

set -u

INPUT=$(cat 2>/dev/null || true)
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"

command -v jq >/dev/null 2>&1 || exit 0
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null || true)

[ -n "$FILE" ] || exit 0
[ -f "$FILE" ] || exit 0

case "$FILE" in
  *.d.ts) exit 0 ;;
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.css | *.md) ;;
  *) exit 0 ;;
esac

ABS_ROOT=$(cd "$ROOT" 2>/dev/null && pwd) || exit 0
# Repo-local binaries only: a global oxlint/oxfmt may be another version and
# report diagnostics that `pnpm run ci` would not.
BIN="$ABS_ROOT/node_modules/.bin"

[ -x "$BIN/oxfmt" ] && "$BIN/oxfmt" --no-error-on-unmatched-pattern "$FILE" >/dev/null 2>&1

case "$FILE" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs) ;;
  *) exit 0 ;;
esac
[ -x "$BIN/oxlint" ] || exit 0

SYNCKIT_TIMEOUT=${SYNCKIT_TIMEOUT:-120000}
export SYNCKIT_TIMEOUT

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
# want: this monorepo has exactly one oxlint config. Keep the path relative - the
# run below is already at $ABS_ROOT, and an absolute --config stops the
# overrides[].files globs matching, reporting every PascalCase component as a
# kebab-case violation.
[ -f "$ABS_ROOT/.oxlintrc.json" ] && set -- "$@" --config .oxlintrc.json
set -- "$@" "$REL_FILE"

if OUT=$(cd "$ABS_ROOT" && "$BIN/oxlint" "$@" 2>&1); then
  exit 0
fi

printf 'oxlint reported problems in %s:\n%s\n' "$REL_FILE" "$OUT" >&2
exit 2
