#!/usr/bin/env sh

HOOK_LIB="${0%/*}/../lib"
[ -r "$HOOK_LIB/guard.sh" ] || {
  printf 'guard fault in %s: cannot read %s/guard.sh\n' "${0##*/}" "$HOOK_LIB" >&2
  exit 2
}
. "$HOOK_LIB/guard.sh"

BLOCK_MSG="Blocked: this command would stage/commit a secret file (.env / .dev.vars / *.pem / *.key / credentials). Never commit secrets - see .cursor/rules/core/guardrails.mdc and .claude/rules/core/guardrails.md. Confirm the file is git-ignored and stage only non-secret files."

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

# Newline-separated path list -> 0 when any entry is a secret.
paths_have_secret() {
  [ -n "$1" ] || return 1
  ph_oldifs=$IFS
  IFS=$PC_NL
  for ph_p in $1; do
    IFS=$ph_oldifs
    if is_secret_path "$ph_p"; then
      return 0
    fi
    IFS=$PC_NL
  done
  IFS=$ph_oldifs
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
  if paths_have_secret "$(pc_operands "$@")"; then
    printf '%s' "$BLOCK_MSG"
    return 0
  fi

  # 2. What git would actually stage. Directory, `:/` and glob pathspecs, and
  #    files inside an untracked directory, never appear in the command text.
  #    Gitignored files are not staged, so an ignored .env is not a hit.
  case $cs_sub in
    add | stage)
      shift
      cs_paths=$(git -C "$ROOT" add --dry-run "$@" 2>/dev/null | sed -n "s/^add '\(.*\)'\$/\1/p" || true)
      ;;
    commit)
      pc_has_flag -a "$@" || pc_has_flag --all "$@" || return 0
      cs_paths=$(git -C "$ROOT" status --porcelain -uno 2>/dev/null | sed -E 's/^...//; s/^.* -> //' || true)
      ;;
  esac
  if paths_have_secret "$cs_paths"; then
    printf '%s' "$BLOCK_MSG"
  fi
  return 0
}

guard_command classify_segment
