#!/usr/bin/env sh
#
# Claude Code only (Cursor has no before-file-edit event); stdout stays silent.
# Scope and rationale: hooks/AGENTS.md, "Content guard".

set -eu

emit_allow() {
  trap - EXIT INT TERM HUP
  exit 0
}

emit_deny() {
  trap - EXIT INT TERM HUP
  printf '%s\n' "$1" >&2
  exit 2
}

emit_fault() {
  trap - EXIT INT TERM HUP
  printf 'guard fault in %s: %s\n' "${0##*/}" "$1" >&2
  exit 2
}

trap 'emit_fault "unexpected error"' EXIT INT TERM HUP

INPUT=$(cat 2>/dev/null || true)
[ -n "$INPUT" ] || emit_allow

command -v jq >/dev/null 2>&1 || emit_fault "jq is required to parse the hook payload; install jq"

# Write -> .content; Edit -> .new_string. Both are scanned the same way.
CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty' 2>/dev/null || true)
[ -n "$CONTENT" ] || emit_allow

FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[ -n "$FILE" ] || FILE='(unknown file)'

# Each entry: <label>|<extended regex>. Lengths are chosen so that obvious
# placeholders (AKIA..., sk-ant-xxx) do not match.
scan() {
  sc_label=$1
  sc_re=$2
  # `-e` is required, not stylistic: the private-key pattern begins with `-`,
  # which grep would otherwise parse as an option bundle. Without it grep errors
  # out, the `|| true` swallows the failure, and the scan silently passes.
  # Only line NUMBERS leave this function - never the matching text.
  sc_lines=$(printf '%s\n' "$CONTENT" | grep -nE -e "$sc_re" 2>/dev/null | cut -d: -f1 | tr '\n' ' ' || true)
  if [ -n "$sc_lines" ]; then
    emit_deny "Blocked: this write appears to contain a live credential ($sc_label) at line(s): ${sc_lines% }. File: $FILE. Never commit secrets - see .claude/rules/core/guardrails.md. Put the real value in apps/<worker>/.env (git-ignored) or a Worker secret, and reference it through the environment; keep only a placeholder in tracked source."
  fi
}

scan 'AWS access key id' 'AKIA[0-9A-Z]{16}'
scan 'private key block' '-----BEGIN[A-Z ]*PRIVATE KEY-----'
scan 'GitHub token' 'gh[pousr]_[A-Za-z0-9]{36,}'
scan 'Slack token' 'xox[baprs]-[0-9A-Za-z-]{10,}'
scan 'Anthropic API key' 'sk-ant-[A-Za-z0-9_-]{24,}'
scan 'OpenAI API key' 'sk-(proj-)?[A-Za-z0-9]{32,}'
scan 'Google API key' 'AIza[0-9A-Za-z_-]{35}'
scan 'Stripe secret key' 'sk_live_[0-9A-Za-z]{20,}'
scan 'JSON web token' 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'

# Deliberately NOT scanned: a bare 40-char-token-dot-suffix shape (the generic
# Cloudflare API token form). It matches minified JS, content hashes and base64
# blobs, and would deny ordinary edits - the same over-broad failure this audit
# set out to remove. Path-based `permissions.deny` covers the files that hold it.

emit_allow
