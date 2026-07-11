#!/usr/bin/env sh
# Validate the mirrored Cursor/Claude configuration without changing files.

set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT HUP INT TERM

FAILURES=0

fail() {
  printf 'AI config error: %s\n' "$1" >&2
  FAILURES=$((FAILURES + 1))
}

normalize_rule() {
  awk '
    NR == 1 && $0 == "---" { frontmatter = 1; next }
    frontmatter && $0 == "---" { frontmatter = 0; next }
    !frontmatter { print }
  ' "$1" |
    sed \
      -e 's/\.cursor\/rules/\.claude\/rules/g' \
      -e 's/\.mdc/\.md/g'
}

normalize_agent() {
  normalize_rule "$1" |
    sed '/<!-- Synced with \.cursor\/agents\/.* -->/d' |
    awk '
      NF { blank = 0; print; next }
      !blank { print; blank = 1 }
    '
}

cd "$ROOT"

git ls-files '.cursor/rules/**' |
  grep -E '\.mdc$' >"$TMP_DIR/cursor-rules"
git ls-files '.claude/rules/**' |
  grep -E '\.md$' >"$TMP_DIR/claude-rules"

while IFS= read -r cursor_rule; do
  relative=${cursor_rule#".cursor/rules/"}
  claude_rule=".claude/rules/${relative%.mdc}.md"

  case "$relative" in
    core/* | frontend/* | backend/* | contracts/* | quality/*) ;;
    *) fail "$cursor_rule is outside an approved category" ;;
  esac

  if [ ! -f "$claude_rule" ]; then
    fail "$cursor_rule has no Claude counterpart at $claude_rule"
    continue
  fi

  normalize_rule "$cursor_rule" >"$TMP_DIR/cursor-rule"
  normalize_rule "$claude_rule" >"$TMP_DIR/claude-rule"
  if ! cmp -s "$TMP_DIR/cursor-rule" "$TMP_DIR/claude-rule"; then
    fail "$cursor_rule and $claude_rule have different rule bodies"
  fi
done <"$TMP_DIR/cursor-rules"

while IFS= read -r claude_rule; do
  relative=${claude_rule#".claude/rules/"}
  cursor_rule=".cursor/rules/${relative%.md}.mdc"
  [ -f "$cursor_rule" ] ||
    fail "$claude_rule has no Cursor counterpart at $cursor_rule"
done <"$TMP_DIR/claude-rules"

git ls-files '.cursor/agents/*.md' >"$TMP_DIR/cursor-agents"
while IFS= read -r cursor_agent; do
  name=${cursor_agent#".cursor/agents/"}
  claude_agent=".claude/agents/$name"
  if [ ! -f "$claude_agent" ]; then
    fail "$cursor_agent has no Claude counterpart"
    continue
  fi

  normalize_agent "$cursor_agent" >"$TMP_DIR/cursor-agent"
  normalize_agent "$claude_agent" >"$TMP_DIR/claude-agent"
  if ! cmp -s "$TMP_DIR/cursor-agent" "$TMP_DIR/claude-agent"; then
    fail "$cursor_agent and $claude_agent have different agent bodies"
  fi
done <"$TMP_DIR/cursor-agents"

grep -hEo 'hooks/[A-Za-z0-9_./-]+\.sh' \
  .cursor/hooks.json .claude/settings.json |
  sort -u >"$TMP_DIR/hook-references"
while IFS= read -r hook; do
  [ -f "$hook" ] || fail "configured hook $hook does not exist"
  [ -x "$hook" ] || fail "configured hook $hook is not executable"
done <"$TMP_DIR/hook-references"

git ls-files -s '.claude/skills/**' |
  awk '$1 == "120000" { sub(/^[^\t]*\t/, ""); print }' \
    >"$TMP_DIR/claude-symlinks"
while IFS= read -r link; do
  [ -e "$link" ] || fail "Claude skill symlink $link is broken"
done <"$TMP_DIR/claude-symlinks"

git ls-files 'apps/*/package.json' 'packages/*/package.json' |
  while IFS= read -r package_file; do
    node -e '
      const packageJson = require("./" + process.argv[1]);
      if (packageJson.name) console.log(packageJson.name);
    ' "$package_file"
  done |
  sort -u >"$TMP_DIR/workspace-names"

grep -hEo 'pnpm --filter [A-Za-z0-9@/_.-]+' \
  .cursor/agents/*.md .claude/agents/*.md |
  awk '{ print $3 }' |
  sort -u >"$TMP_DIR/agent-workspaces" || true
while IFS= read -r workspace; do
  [ -z "$workspace" ] && continue
  grep -Fxq "$workspace" "$TMP_DIR/workspace-names" ||
    fail "agent command references unknown workspace $workspace"
done <"$TMP_DIR/agent-workspaces"

if [ "$FAILURES" -ne 0 ]; then
  printf 'AI configuration validation failed with %s error(s).\n' "$FAILURES" >&2
  exit 1
fi

printf 'AI configuration validation passed.\n'
