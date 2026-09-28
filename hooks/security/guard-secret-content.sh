#!/usr/bin/env sh
#
# Claude Code only (Cursor has no before-file-edit event); stdout stays silent.
# Scope and rationale: hooks/AGENTS.md, "Content guard".

HOOK_LIB="${0%/*}/../lib"
[ -r "$HOOK_LIB/guard.sh" ] || {
  printf 'guard fault in %s: cannot read %s/guard.sh\n' "${0##*/}" "$HOOK_LIB" >&2
  exit 2
}
. "$HOOK_LIB/guard.sh"

# Write -> .content; Edit -> .new_string. Both are scanned the same way.
CONTENT=$(field '.tool_input.content // .tool_input.new_string')
[ -n "$CONTENT" ] || emit_allow

FILE=$(field '.tool_input.file_path')
[ -n "$FILE" ] || FILE='(unknown file)'

# Each entry: <label>|<extended regex>. Lengths are chosen so that obvious
# placeholders (AKIA..., sk-ant-xxx) do not match.
scan() {
  # `-e` is required, not stylistic: the private-key pattern begins with `-`,
  # which grep would otherwise parse as an option bundle. Without it grep errors
  # out, the `|| true` swallows the failure, and the scan silently passes.
  # Only line NUMBERS leave this function - never the matching text.
  sc_lines=$(printf '%s\n' "$CONTENT" | grep -nE -e "$2" 2>/dev/null | cut -d: -f1 | tr '\n' ' ' || true)
  if [ -n "$sc_lines" ]; then
    emit_deny "Blocked: this write appears to contain a live credential ($1) at line(s): ${sc_lines% }. File: $FILE. Never commit secrets - see .claude/rules/core/guardrails.md. Put the real value in apps/<worker>/.env (git-ignored) or a Worker secret, and reference it through the environment; keep only a placeholder in tracked source."
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
