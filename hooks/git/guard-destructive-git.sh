#!/usr/bin/env sh
# Purpose: Block history-rewriting / working-tree-destroying git commands.
# Target: Cursor preToolUse (Shell) and Claude Code PreToolUse (Bash).
# Canonical location: hooks/git/ - wired from .cursor/hooks.json and .claude/settings.json.
#
# Mirrors .cursor/rules/guardrails.mdc and .claude/rules/guardrails.md.

INPUT=$(cat 2>/dev/null || true)

if command -v jq >/dev/null 2>&1; then
  CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null || true)
else
  CMD=$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' 2>/dev/null || true)
fi

[ -z "$CMD" ] && exit 0

case "$CMD" in
  *git*) ;;
  *) exit 0 ;;
esac

word() { printf '%s' "$CMD" | grep -Eq "(^|[[:space:]])$1([[:space:]]|\$)"; }

REASON=""

if word 'reset' && word '\-\-hard'; then
  REASON="git reset --hard discards uncommitted changes"
elif word 'clean' && { printf '%s' "$CMD" | grep -Eq '(^|[[:space:]])-[A-Za-z]*f[A-Za-z]*([[:space:]]|$)' || word '\-\-force'; }; then
  REASON="git clean -f permanently deletes untracked files"
elif word 'push' && { word '\-\-force' || word '\-\-force-with-lease' || word '\-f'; }; then
  REASON="git push --force rewrites remote history"
elif word 'push' && word '\-\-delete'; then
  REASON="git push --delete removes a remote branch/tag"
elif word 'branch' && { word '\-d' || word '\-D' || word '\-\-delete'; }; then
  REASON="git branch -d/-D deletes a branch"
elif word 'tag' && { word '\-d' || word '\-\-delete'; }; then
  REASON="git tag -d deletes a tag"
elif word 'checkout' && { printf '%s' "$CMD" | grep -Eq '(^|[[:space:]])--([[:space:]]|$)' || word '\.'; }; then
  REASON="git checkout -- / git checkout . discards uncommitted changes"
elif word 'restore' && ! word '\-\-staged'; then
  REASON="git restore <path> discards uncommitted changes"
fi

[ -z "$REASON" ] && exit 0

echo "Blocked: $REASON. Per .cursor/rules/guardrails.mdc, destructive/irreversible git operations must not run autonomously. Ask the user to confirm this exact command, and let them run it themselves if they approve." >&2
exit 2
