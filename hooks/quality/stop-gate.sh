#!/usr/bin/env sh

set -u

INPUT=$(cat 2>/dev/null || true)
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"

command -v jq >/dev/null 2>&1 || exit 0
cd "$ROOT" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

field() {
  printf '%s' "$INPUT" | jq -r "$1" 2>/dev/null
}

# One enforced retry per turn: Claude sets stop_hook_active on the stop that
# follows a block, Cursor counts its follow-ups in loop_count.
[ "$(field '.stop_hook_active // false')" = "true" ] && exit 0
LOOPS=$(field '.loop_count // 0')
[ "${LOOPS:-0}" -gt 0 ] 2>/dev/null && exit 0

[ -z "$(git status --porcelain 2>/dev/null)" ] && exit 0
# A checkout that was never installed has nothing to run the gate with; the
# SessionStart hook already tells the agent to install.
[ -x node_modules/.bin/turbo ] || exit 0

UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)
FINGERPRINT=$({
  git diff HEAD --no-ext-diff --binary 2>/dev/null
  printf '%s\n' "$UNTRACKED"
  [ -n "$UNTRACKED" ] && printf '%s\n' "$UNTRACKED" | git hash-object --stdin-paths 2>/dev/null
} | shasum -a 256 | cut -d ' ' -f 1)

# Keyed on the tree state, pass or fail: an unchanged failing tree - often the
# user's own uncommitted work - is reported once, not on every later turn.
SESSION=$(field '.session_id // .conversation_id // "default"')
SESSION=$(printf '%s' "$SESSION" | tr -c 'A-Za-z0-9_-' '_')
STATE="${TMPDIR:-/tmp}/claude-stop-gate-${SESSION}"
[ "$(cat "$STATE" 2>/dev/null)" = "$FINGERPRINT" ] && exit 0

LOG="${TMPDIR:-/tmp}/claude-stop-gate-${SESSION}.log"
export NO_COLOR=1 FORCE_COLOR=0 TURBO_UI=false
STATUS=0
# //#hooks:test stays out: its suite runs this script, so including it would let
# a broken test fixture recurse into the real checkout.
pnpm turbo run //#lint:agent //#format:check //#deps:check //#deps:format:check \
  --output-logs=errors-only --continue=dependencies-successful >"$LOG" 2>&1 || STATUS=1
# Root tasks drop out of --affected when only workspace files changed, so the
# type check runs as its own affected-scoped pass.
pnpm turbo run check-types --affected \
  --output-logs=errors-only --continue=dependencies-successful >>"$LOG" 2>&1 || STATUS=1
printf '%s\n' "$FINGERPRINT" >"$STATE" 2>/dev/null || true
[ "$STATUS" -eq 0 ] && exit 0

ESC=$(printf '\033')
MSG="Stop gate: the fast checks fail on the current working tree (lint, format, syncpack, check-types --affected). Fix the diagnostics below, or tell the user why they are out of scope for this task.

$(sed "s/${ESC}\[[0-9;]*m//g" "$LOG" |
  grep -vE '^[[:space:]]*$|^[[:space:]]*•|cache (hit|miss|bypass)|WARNING|^[[:space:]]*(Tasks|Cached|Time):|: \$ ' |
  tail -n 60)"

if [ -n "${CURSOR_PROJECT_DIR:-}" ]; then
  jq -nc --arg m "$MSG" '{followup_message: $m}'
  exit 0
fi
printf '%s\n' "$MSG" >&2
exit 2
