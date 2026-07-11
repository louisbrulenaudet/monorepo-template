#!/usr/bin/env sh
# Smoke-test hook JSON parsing and guard decisions without changing the repo.

set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
FAILURES=0

expect_status() {
  expected=$1
  script=$2
  input=$3
  label=$4

  set +e
  printf '%s' "$input" | sh "$ROOT/$script" >/dev/null 2>&1
  actual=$?
  set -e

  if [ "$actual" -ne "$expected" ]; then
    printf 'Hook test failed: %s (expected %s, got %s)\n' \
      "$label" "$expected" "$actual" >&2
    FAILURES=$((FAILURES + 1))
  fi
}

expect_status 2 hooks/git/guard-destructive-git.sh \
  '{"command":"git reset --hard HEAD"}' \
  "Cursor destructive command"
expect_status 2 hooks/git/guard-destructive-git.sh \
  '{"tool_input":{"command":"git push --force origin main"}}' \
  "Claude destructive command"
expect_status 0 hooks/git/guard-destructive-git.sh \
  '{"command":"git status --short"}' \
  "safe git command"

expect_status 2 hooks/git/guard-secret-commit.sh \
  '{"command":"git add apps/worker-api/.dev.vars"}' \
  "Cursor secret staging"
expect_status 2 hooks/git/guard-secret-commit.sh \
  '{"tool_input":{"command":"git add private.pem"}}' \
  "Claude secret staging"
expect_status 0 hooks/git/guard-secret-commit.sh \
  '{"command":"git add apps/worker-api/.dev.vars.example"}' \
  "documented secret example"

expect_status 0 hooks/quality/check-changed.sh \
  '{"file_path":"/path/that/does/not/exist.ts"}' \
  "Cursor missing edited file"
expect_status 0 hooks/quality/check-changed.sh \
  '{"tool_input":{"file_path":"/path/that/does/not/exist.ts"}}' \
  "Claude missing edited file"

if [ "$FAILURES" -ne 0 ]; then
  printf 'Hook smoke tests failed with %s error(s).\n' "$FAILURES" >&2
  exit 1
fi

printf 'Hook smoke tests passed.\n'
