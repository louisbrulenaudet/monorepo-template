#!/usr/bin/env sh
# Purpose: Block shell git commands that would stage/commit a secret file.
# Target: Cursor preToolUse (Shell) and Claude Code PreToolUse (Bash).
# Canonical location: hooks/git/ - wired from .cursor/hooks.json and .claude/settings.json.
#
# Enforces "Never commit secrets" (.cursor/rules/core/guardrails.mdc).

INPUT=$(cat 2>/dev/null || true)
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"

if command -v jq >/dev/null 2>&1; then
  CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null || true)
else
  CMD=$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' 2>/dev/null || true)
fi

[ -z "$CMD" ] && exit 0

case "$CMD" in
  *git*add*|*git*commit*) ;;
  *) exit 0 ;;
esac

set -f

SECRET_RE='(\.env|\.dev\.vars|\.prod\.vars|\.staging\.vars|\.pem|\.key|\.p12|\.pfx|id_rsa|credentials)'
BLOCK_MSG="Blocked: this command looks like it would stage/commit a secret file (.env / .dev.vars / *.pem / *.key / credentials). Never commit secrets - see .cursor/rules/core/guardrails.mdc. Confirm the file is git-ignored and stage only non-secret files."

for tok in $CMD; do
  case "$tok" in
    *.example|*.example[!a-z]*) continue ;;
  esac
  if printf '%s' "$tok" | grep -Eiq "$SECRET_RE"; then
    echo "$BLOCK_MSG" >&2
    exit 2
  fi
done

is_bulk() {
  { printf '%s' "$CMD" | grep -Eq '(^|[[:space:]])git[[:space:]]+add([[:space:]]|$)' \
      && printf '%s' "$CMD" | grep -Eq '(^|[[:space:]])(\.|-A|-u|--all|--update)([[:space:]]|$)'; } \
  || { printf '%s' "$CMD" | grep -Eq '(^|[[:space:]])git[[:space:]]+commit([[:space:]]|$)' \
      && printf '%s' "$CMD" | grep -Eq '(^|[[:space:]])-[A-Za-z]*a[A-Za-z]*([[:space:]]|$)'; }
}

if is_bulk; then
  if git -C "$ROOT" status --porcelain 2>/dev/null \
       | sed -E 's/^...//; s/^.* -> //' \
       | grep -vE '\.example([^a-z]|$)' \
       | grep -Eiq "$SECRET_RE"; then
    echo "$BLOCK_MSG" >&2
    exit 2
  fi
fi

exit 0
