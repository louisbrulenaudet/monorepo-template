#!/usr/bin/env sh

set -eu
set -f # never glob-expand untrusted command text

BLOCK_MSG="Blocked: this command would stage/commit a secret file (.env / .dev.vars / *.pem / *.key / credentials). Never commit secrets - see .cursor/rules/core/guardrails.mdc and .claude/rules/core/guardrails.md. Confirm the file is git-ignored and stage only non-secret files."

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

PC_LIB="${0%/*}/lib/parse-command.sh"
[ -r "$PC_LIB" ] || emit_fault "cannot read $PC_LIB"
. "$PC_LIB"

is_secret_path() {
  sp=${1##*/}
  case $sp in
    *.example | *.example.* | *.sample | *.template | *.dist) return 1 ;;
  esac
  case $sp in
    # `.env`, `.env.local`, `app.env`. Note `*.env` matches only when the name
    # ENDS in .env, so a real source file called config.env.ts is untouched;
    # `*.env.*` is deliberately NOT listed for exactly that reason.
    .env | .env.* | .envrc | *.env) return 0 ;;
    .dev.vars | .dev.vars.*) return 0 ;;
    .prod.vars | .prod.vars.*) return 0 ;;
    .staging.vars | .staging.vars.*) return 0 ;;
    *.pem | *.key | *.p12 | *.pfx | *.jks | *.keystore) return 0 ;;
    id_rsa | id_dsa | id_ecdsa | id_ed25519) return 0 ;;
    credentials | credentials.* | secrets.json | *.credentials) return 0 ;;
  esac
  return 1
}

# Would a bulk stage sweep in a secret already in the tree? Gitignored files
# never appear in --porcelain, so an ignored .env is not a hit.
bulk_would_stage_secret() {
  bw_paths=$(git -C "$ROOT" status --porcelain 2>/dev/null | sed -E 's/^...//; s/^.* -> //' || true)
  [ -n "$bw_paths" ] || return 1
  bw_oldifs=$IFS
  IFS=$PC_NL
  for bw_p in $bw_paths; do
    IFS=$bw_oldifs
    if is_secret_path "$bw_p"; then
      return 0
    fi
    IFS=$PC_NL
  done
  IFS=$bw_oldifs
  return 1
}

classify_segment() {
  cs_oldifs=$IFS
  IFS=$PC_NL
  set -- $(pc_git_argv "$1")
  IFS=$cs_oldifs
  [ $# -gt 0 ] || return 0

  case $1 in
    add | commit | stage) ;;
    *) return 0 ;;
  esac
  cs_sub=$1

  # 1. An explicitly named secret pathspec. Option VALUES are excluded by
  #    pc_operands, so a commit message mentioning .env.local is fine.
  cs_ops=$(pc_operands "$@")
  IFS=$PC_NL
  for cs_op in $cs_ops; do
    IFS=$cs_oldifs
    if is_secret_path "$cs_op"; then
      printf '%s' "$BLOCK_MSG"
      return 0
    fi
    IFS=$PC_NL
  done
  IFS=$cs_oldifs

  # 2. Bulk staging that would sweep in a secret already in the tree.
  cs_bulk=0
  case $cs_sub in
    add | stage)
      if pc_has_flag -A "$@" || pc_has_flag --all "$@" \
        || pc_has_flag -u "$@" || pc_has_flag --update "$@"; then
        cs_bulk=1
      fi
      if printf '%s\n' "$cs_ops" | grep -qx '\.'; then
        cs_bulk=1
      fi
      ;;
    commit)
      if pc_has_flag -a "$@" || pc_has_flag --all "$@"; then
        cs_bulk=1
      fi
      ;;
  esac
  if [ "$cs_bulk" -eq 1 ] && bulk_would_stage_secret; then
    printf '%s' "$BLOCK_MSG"
    return 0
  fi
  return 0
}

INPUT=$(cat 2>/dev/null || true)
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"

[ -n "$INPUT" ] || emit_allow

command -v jq >/dev/null 2>&1 || emit_fault "jq is required to parse the hook payload; install jq"
command -v awk >/dev/null 2>&1 || emit_fault "awk is required to parse the command; install awk"

CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null || true)
[ -n "$CMD" ] || emit_allow

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
  emit_deny "$REASON"
fi
emit_allow
