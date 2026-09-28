#!/usr/bin/env sh
#
# Sourced first by every guard. Reads the payload into INPUT and installs a trap
# that turns any unexpected exit into a deny, so a guard fails closed.

set -euf # -f: never glob-expand untrusted command text

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

emit_fault() {
  trap - EXIT INT TERM HUP
  printf 'guard fault in %s: %s\n' "${0##*/}" "$1" >&2
  cursor_deny_json "guard fault: $1" 2>/dev/null || true
  exit 2
}

trap 'emit_fault "unexpected error"' EXIT INT TERM HUP

INPUT=$(cat 2>/dev/null || true)
[ -n "$INPUT" ] || emit_allow
command -v jq >/dev/null 2>&1 || emit_fault "jq is required to parse the hook payload; install jq"
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"

# field <jq path>: the payload value, or an empty string.
field() {
  printf '%s' "$INPUT" | jq -r "$1 // empty" 2>/dev/null || true
}

# guard_command <classifier>: runs the classifier on every segment of the shell
# command, including the payload of `sh -c` / `eval`, and denies with the first
# non-empty message it prints.
guard_command() {
  command -v awk >/dev/null 2>&1 || emit_fault "awk is required to parse the command; install awk"
  [ -r "$HOOK_LIB/parse-command.sh" ] || emit_fault "cannot read $HOOK_LIB/parse-command.sh"
  . "$HOOK_LIB/parse-command.sh"
  GUARD_CLASSIFY=$1
  gc_cmd=$(field '.tool_input.command // .command')
  [ -n "$gc_cmd" ] || emit_allow
  guard_check "$gc_cmd" 1
  emit_allow
}

# Every test uses `if`, never `cmd && action`: under `set -e` the failure
# semantics of that form vary between shells.
guard_check() {
  if [ "$2" -gt 3 ]; then
    emit_deny "Blocked: shells nested more than 3 deep cannot be checked. Ask the user to run this command themselves."
  fi
  gc_segs=$(pc_segments "$1")
  gc_oldifs=$IFS
  IFS=$PC_NL
  for gc_seg in $gc_segs; do
    IFS=$gc_oldifs
    gc_reason=$("$GUARD_CLASSIFY" "$gc_seg")
    if [ -n "$gc_reason" ]; then
      emit_deny "$gc_reason"
    fi
    gc_inner=$(pc_shell_payload "$gc_seg")
    if [ -n "$gc_inner" ]; then
      guard_check "$gc_inner" $(($2 + 1))
    fi
    IFS=$PC_NL
  done
  IFS=$gc_oldifs
}
