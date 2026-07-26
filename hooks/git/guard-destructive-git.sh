#!/usr/bin/env sh
# Purpose: Block history-rewriting / working-tree-destroying git commands.
# Target: Cursor beforeShellExecution and Claude Code PreToolUse (Bash).
# Canonical location: hooks/git/ - wired from .cursor/hooks.json and .claude/settings.json.
#
# Mirrors guardrails: destructive/irreversible git operations must not run
# autonomously.
#
# Output contract - two harnesses, one script:
#   Claude Code: exit 2 blocks and stderr carries the reason. stdout is IGNORED
#     on exit 2 and is not injected on PreToolUse, so this script keeps stdout
#     SILENT for Claude. Emitting the Cursor JSON here would make the block
#     depend on Claude Code tolerating unknown JSON keys, which is undocumented.
#   Cursor: failClosed expects a JSON verdict on stdout, so the JSON is emitted
#     only when CURSOR_PROJECT_DIR is set. Claude Code never sets it.
#
# Failure mode: FAIL CLOSED - see guard-secret-commit.sh for the rationale. The
# trap is installed BEFORE the library is sourced and the fault path uses only
# shell builtins, so even a broken PATH yields exit 2 rather than exit 1 (which
# would not block).
#
# Dangerous (subcommand, flag) pairs are matched WITHIN a single git invocation
# via lib/parse-command.sh, so `git status && echo "reset --hard"` is allowed
# while `git reset --hard` is denied.
#
# Structure note: classification lives in a top-level function rather than
# inline inside a command substitution. macOS /bin/sh (bash 3.2) mis-parses an
# unparenthesised `case` pattern when it appears inside `$( ... )`.

set -eu
set -f # never glob-expand untrusted command text

# Emitted only for Cursor, whose failClosed mode requires a JSON verdict.
cursor_deny_json() {
  [ -n "${CURSOR_PROJECT_DIR:-}" ] || return 0
  cj=$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr -d '\n')
  printf '{"permission":"deny","user_message":"%s","agent_message":"%s"}\n' "$cj" "$cj"
}

emit_allow() {
  trap - EXIT INT TERM HUP
  [ -n "${CURSOR_PROJECT_DIR:-}" ] && printf '%s\n' '{"permission":"allow"}'
  exit 0
}

emit_deny() {
  trap - EXIT INT TERM HUP
  cursor_deny_json "$1"
  printf '%s\n' "$1" >&2
  exit 2
}

# Builtins only: printf is a shell builtin and ${0##*/} needs no basename, so
# this still reports and blocks when PATH is unusable.
emit_fault() {
  trap - EXIT INT TERM HUP
  printf 'guard fault in %s: %s\n' "${0##*/}" "$1" >&2
  cursor_deny_json "guard fault: $1" 2>/dev/null || true
  exit 2
}

trap 'emit_fault "unexpected error"' EXIT INT TERM HUP

PC_LIB="${0%/*}/lib/parse-command.sh"
[ -r "$PC_LIB" ] || emit_fault "cannot read $PC_LIB"
. "$PC_LIB"

# classify_segment <segment> -> prints a reason, or nothing.
# Every test uses `if`, never `cmd && assignment`: under `set -e` the failure
# semantics of that form vary between shells, and a stray non-zero status would
# fail closed on ordinary git commands.
classify_segment() {
  cs_oldifs=$IFS
  IFS=$PC_NL
  set -- $(pc_git_argv "$1")
  IFS=$cs_oldifs
  [ $# -gt 0 ] || return 0

  cs_sub=$1
  cs_why=''

  # pc_has_flag deliberately stops scanning at `--`, so detect it separately.
  cs_dashdash=0
  for cs_a in "$@"; do
    if [ "$cs_a" = '--' ]; then
      cs_dashdash=1
      break
    fi
  done

  case $cs_sub in
    reset)
      if pc_has_flag --hard "$@"; then
        cs_why="git reset --hard discards uncommitted changes"
      fi
      ;;
    clean)
      if pc_has_flag -f "$@" || pc_has_flag --force "$@"; then
        cs_why="git clean -f permanently deletes untracked files"
      fi
      ;;
    push)
      if pc_has_flag --force "$@" || pc_has_flag --force-with-lease "$@" \
        || pc_has_flag --force-if-includes "$@" || pc_has_flag -f "$@"; then
        cs_why="git push --force rewrites remote history"
      elif pc_has_flag --delete "$@" || pc_has_flag -d "$@"; then
        cs_why="git push --delete removes a remote branch/tag"
      fi
      ;;
    branch)
      if pc_has_flag -d "$@" || pc_has_flag -D "$@" || pc_has_flag --delete "$@"; then
        cs_why="git branch -d/-D deletes a branch"
      fi
      ;;
    tag)
      if pc_has_flag -d "$@" || pc_has_flag --delete "$@"; then
        cs_why="git tag -d deletes a tag"
      fi
      ;;
    checkout)
      # `git checkout -- <path>` and `git checkout .` discard working-tree
      # changes. A plain `git checkout <branch>` is not destructive.
      if [ "$cs_dashdash" -eq 1 ]; then
        cs_why="git checkout -- <path> discards uncommitted changes"
      elif pc_operands "$@" | grep -qx '\.'; then
        cs_why="git checkout . discards uncommitted changes"
      fi
      ;;
    restore)
      # --staged (or its short form -S) alone only unstages, which is reversible.
      # --worktree/-W destroys the working copy even when --staged is also given.
      if pc_has_flag --worktree "$@" || pc_has_flag -W "$@"; then
        cs_why="git restore --worktree discards uncommitted changes"
      elif ! pc_has_flag --staged "$@" && ! pc_has_flag -S "$@"; then
        cs_why="git restore <path> discards uncommitted changes"
      fi
      ;;
    filter-branch)
      cs_why="git filter-branch rewrites history across the whole repository"
      ;;
    update-ref)
      if pc_has_flag -d "$@"; then
        cs_why="git update-ref -d deletes a ref"
      fi
      ;;
  esac

  printf '%s' "$cs_why"
  return 0
}

INPUT=$(cat 2>/dev/null || true)

[ -n "$INPUT" ] || emit_allow

command -v jq >/dev/null 2>&1 || emit_fault "jq is required to parse the hook payload; install jq"
command -v awk >/dev/null 2>&1 || emit_fault "awk is required to parse the command; install awk"

CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null || true)
[ -n "$CMD" ] || emit_allow

# Each segment is judged independently; the first offender wins.
REASON=''
SEGS=$(pc_segments "$CMD")
oldifs=$IFS
IFS=$PC_NL
for seg in $SEGS; do
  IFS=$oldifs
  REASON=$(classify_segment "$seg")
  if [ -n "$REASON" ]; then
    break
  fi
  IFS=$PC_NL
done
IFS=$oldifs

if [ -n "$REASON" ]; then
  emit_deny "Blocked: $REASON. Per .cursor/rules/core/guardrails.mdc and .claude/rules/core/guardrails.md, destructive/irreversible git operations must not run autonomously. Ask the user to confirm this exact command, and let them run it themselves if they approve."
fi
emit_allow
