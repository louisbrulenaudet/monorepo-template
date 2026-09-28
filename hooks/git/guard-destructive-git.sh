#!/usr/bin/env sh

HOOK_LIB="${0%/*}/../lib"
[ -r "$HOOK_LIB/guard.sh" ] || {
  printf 'guard fault in %s: cannot read %s/guard.sh\n' "${0##*/}" "$HOOK_LIB" >&2
  exit 2
}
. "$HOOK_LIB/guard.sh"

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
      elif pc_has_flag --mirror "$@"; then
        cs_why="git push --mirror overwrites and deletes remote refs"
      elif pc_has_flag --delete "$@" || pc_has_flag -d "$@"; then
        cs_why="git push --delete removes a remote branch/tag"
      elif pc_operands "$@" | grep -q '^[+:]'; then
        cs_why="git push +<ref> or :<ref> force-pushes or deletes a remote ref"
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
      # `git checkout -- <path>`, `git checkout .` and `-f` discard working-tree
      # changes. A plain `git checkout <branch>` is not destructive.
      if [ "$cs_dashdash" -eq 1 ]; then
        cs_why="git checkout -- <path> discards uncommitted changes"
      elif pc_has_flag -f "$@" || pc_has_flag --force "$@"; then
        cs_why="git checkout -f discards uncommitted changes"
      elif pc_operands "$@" | grep -qx '\.'; then
        cs_why="git checkout . discards uncommitted changes"
      fi
      ;;
    switch)
      if pc_has_flag --discard-changes "$@" || pc_has_flag -f "$@" || pc_has_flag --force "$@"; then
        cs_why="git switch --discard-changes discards uncommitted changes"
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

  if [ -n "$cs_why" ]; then
    printf 'Blocked: %s. Per .cursor/rules/core/guardrails.mdc and .claude/rules/core/guardrails.md, destructive/irreversible git operations must not run autonomously. Ask the user to confirm this exact command, and let them run it themselves if they approve.' "$cs_why"
  fi
  return 0
}

guard_command classify_segment
