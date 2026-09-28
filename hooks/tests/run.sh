#!/usr/bin/env sh

set -u

ROOT=$(cd "${0%/*}/../.." && pwd)
HOOKS="$ROOT/hooks"
unset CURSOR_PROJECT_DIR

command -v jq >/dev/null 2>&1 || {
  printf 'hooks:test needs jq\n' >&2
  exit 1
}

runs=0
fails=0

fail() {
  fails=$((fails + 1))
  printf 'FAIL %s\n' "$1"
}

bash_payload() {
  jq -nc --arg c "$1" '{tool_input:{command:$c}}'
}

write_payload() {
  jq -nc --arg f "$1" --arg c "$2" '{tool_input:{file_path:$f,content:$c}}'
}

# expect <exit> <guard> <payload> <label>: Claude path, stdout must stay silent.
expect() {
  runs=$((runs + 1))
  out=$(printf '%s' "$3" | CLAUDE_PROJECT_DIR="$ROOT" sh "$HOOKS/$2" 2>/dev/null)
  got=$?
  if [ "$got" -ne "$1" ]; then
    fail "$2: $4 (want exit $1, got $got)"
  elif [ -n "$out" ]; then
    fail "$2: $4 (stdout not silent on the Claude path)"
  fi
}

# expect_cursor <exit> <guard> <payload> <verdict> <label>
expect_cursor() {
  runs=$((runs + 1))
  out=$(printf '%s' "$3" | CURSOR_PROJECT_DIR="$ROOT" sh "$HOOKS/$2" 2>/dev/null)
  got=$?
  if [ "$got" -ne "$1" ]; then
    fail "$2: $5 (want exit $1, got $got)"
  elif [ "$(printf '%s' "$out" | jq -r '.permission' 2>/dev/null)" != "$4" ]; then
    fail "$2: $5 (want Cursor verdict $4, got: $out)"
  fi
}

for f in "$HOOKS"/*/*.sh; do
  runs=$((runs + 1))
  sh -n "$f" || fail "syntax: ${f#"$ROOT"/}"
done

D=git/guard-destructive-git.sh
expect 2 $D "$(bash_payload 'git push --force')" 'push --force'
expect 2 $D "$(bash_payload 'git reset --hard')" 'reset --hard'
expect 2 $D "$(bash_payload 'cd apps && git reset --hard HEAD~1')" 'reset --hard after a separator'
expect 2 $D "$(bash_payload 'git checkout -- src/index.ts')" 'checkout --'
expect 2 $D "$(bash_payload 'git clean -fd')" 'clean -fd'
expect 2 $D "$(bash_payload 'git branch -D feature')" 'branch -D'
expect 2 $D "$(bash_payload 'git restore src/index.ts')" 'restore <path>'
expect 2 $D "$(bash_payload 'echo `git reset --hard`')" 'backtick substitution'
expect 2 $D "$(bash_payload 'sh -c "git reset --hard"')" 'sh -c payload'
expect 2 $D "$(bash_payload 'bash -lc "cd apps && git push --force"')" 'bundled -lc payload'
expect 2 $D "$(bash_payload 'eval "git reset --hard"')" 'eval payload'
expect 2 $D "$(bash_payload 'git push origin +main')" 'push +refspec'
expect 2 $D "$(bash_payload 'git push origin :old-branch')" 'push :refspec'
expect 2 $D "$(bash_payload 'git push --mirror')" 'push --mirror'
expect 2 $D "$(bash_payload 'git checkout -f main')" 'checkout -f'
expect 2 $D "$(bash_payload 'git switch --discard-changes main')" 'switch --discard-changes'
expect 0 $D "$(bash_payload 'git status')" 'status'
expect 0 $D "$(bash_payload 'bash -c "git status"')" 'harmless sh -c payload'
expect 0 $D "$(bash_payload 'git push -u origin feature')" 'push a new branch'
expect 0 $D "$(bash_payload 'git switch main')" 'switch <branch>'
expect 0 $D "$(bash_payload 'git checkout main')" 'checkout <branch>'
expect 0 $D "$(bash_payload 'git restore --staged src/index.ts')" 'restore --staged'
expect 0 $D "$(bash_payload 'git commit -m "reset --hard later"')" 'flag text inside a message'
expect 0 $D "$(bash_payload 'cat hooks/git/guard-destructive-git.sh')" 'command naming the guard'
expect 0 $D '' 'empty payload'
expect_cursor 2 $D "$(jq -nc '{command:"git push --force"}')" deny 'Cursor deny verdict'
expect_cursor 0 $D "$(jq -nc '{command:"git status"}')" allow 'Cursor allow verdict'

S=git/guard-secret-commit.sh
expect 2 $S "$(bash_payload 'git add .env')" 'add .env'
expect 2 $S "$(bash_payload 'git add .env 2>&1')" 'add .env with a redirect'
expect 2 $S "$(bash_payload 'git add apps/worker-api/.dev.vars')" 'add .dev.vars'
expect 2 $S "$(bash_payload 'git add certs/server.pem')" 'add *.pem'
expect 0 $S "$(bash_payload 'git add foo.txt 2>&1')" 'redirect must not fault the parser'
expect 0 $S "$(bash_payload 'git add config.env.ts')" 'source file with env in its name'
expect 0 $S "$(bash_payload 'git add .env.example')" 'example env file'
expect 0 $S "$(bash_payload 'git commit -m "document .env.local setup"')" 'secret name inside a message'
expect 0 $S "$(bash_payload 'git status')" 'status'
expect 2 $S "$(bash_payload 'sh -c "git add .env"')" 'sh -c payload'
expect_cursor 2 $S "$(jq -nc '{command:"git add .env"}')" deny 'Cursor deny verdict'

C=security/guard-secret-content.sh
expect 2 $C "$(write_payload src/a.ts 'const k = "AKIA''IOSFODNN7EXAMPLE";')" 'AWS access key id'
expect 2 $C "$(write_payload src/a.pem '-----BEGIN RSA ''PRIVATE KEY-----')" 'private key block'
expect 0 $C "$(write_payload src/a.ts 'const k = "AKIA...";')" 'placeholder key'
expect 0 $C "$(write_payload src/a.ts 'export const x = 1;')" 'ordinary source'

G=security/guard-generated-files.sh
expect 2 $G "$(write_payload apps/worker-api/worker-configuration.d.ts 'x')" 'wrangler types output'
expect 2 $G "$(write_payload apps/front-app/src/routeTree.gen.ts 'x')" 'router tree output'
expect 2 $G "$(write_payload pnpm-lock.yaml 'x')" 'lockfile'
expect 2 $G "$(write_payload apps/front-app/dist/index.js 'x')" 'build output'
expect 0 $G "$(write_payload apps/worker-api/src/index.ts 'x')" 'ordinary source'

# Explicit template: macOS mktemp ignores TMPDIR otherwise. An empty SCRATCH
# would point every case below at the real checkout.
SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/hooks-test.XXXXXX") && [ -d "$SCRATCH" ] || {
  printf 'hooks:test cannot create a scratch directory\n' >&2
  exit 1
}
trap 'rm -rf "$SCRATCH"' EXIT

# expect_in <exit> <script> <project dir> <payload> <label>: stdout must stay silent.
expect_in() {
  runs=$((runs + 1))
  out=$(printf '%s' "$4" | CLAUDE_PROJECT_DIR="$3" sh "$HOOKS/$2" 2>/dev/null)
  got=$?
  if [ "$got" -ne "$1" ]; then
    fail "$2: $5 (want exit $1, got $got)"
  elif [ -n "$out" ]; then
    fail "$2: $5 (stdout not silent)"
  fi
}

CLEAN="$SCRATCH/clean"
DIRTY="$SCRATCH/dirty"
mkdir -p "$CLEAN" "$DIRTY"
git -C "$CLEAN" init -q
git -C "$DIRTY" init -q
printf 'x\n' >"$DIRTY/untracked.ts"

T=quality/stop-gate.sh
expect 0 $T '{"stop_hook_active":true}' 'retry after a block'
expect_in 0 $T "$SCRATCH" '{}' 'not a git repository'
expect_in 0 $T "$CLEAN" '{}' 'clean tree'
expect_in 0 $T "$DIRTY" '{}' 'dirty tree without an install'
runs=$((runs + 1))
out=$(printf '%s' '{"loop_count":1}' | CURSOR_PROJECT_DIR="$DIRTY" sh "$HOOKS/$T" 2>/dev/null)
[ -z "$out" ] || fail "$T: Cursor follow-up already spent (got: $out)"

X=session/session-context.sh
runs=$((runs + 1))
out=$(printf '{}' | CLAUDE_PROJECT_DIR="$CLEAN" sh "$HOOKS/$X" 2>/dev/null)
case "$out" in
  *'pnpm install --frozen-lockfile'*) ;;
  *) fail "$X: missing install must be reported (got: $out)" ;;
esac
mkdir -p "$DIRTY/node_modules"
: >"$DIRTY/node_modules/.pnpm-workspace-state-v1.json"
touch -t 202001010000 "$DIRTY/pnpm-lock.yaml"
expect_in 0 $X "$DIRTY" '{}' 'installed checkout, no dev ports'
runs=$((runs + 1))
out=$(printf '{}' | CURSOR_PROJECT_DIR="$CLEAN" sh "$HOOKS/$X" 2>/dev/null)
[ "$(printf '%s' "$out" | jq -r '.additional_context' 2>/dev/null | head -n 1)" = 'Session checks:' ] ||
  fail "$X: Cursor additional_context (got: $out)"

L=logging/instructions-loaded.sh
runs=$((runs + 1))
printf '%s' '{"hook_event_name":"InstructionsLoaded","file_path":"/r/CLAUDE.md","load_reason":"session_start","memory_type":"Project"}' |
  CLAUDE_PROJECT_DIR="$SCRATCH" sh "$HOOKS/$L" >/dev/null 2>&1
line=$(tail -n 1 "$SCRATCH/hooks/logs/instructions-loaded.log" 2>/dev/null | cut -f 2)
[ "$(printf '%s' "$line" | jq -r '.path + " " + .reason' 2>/dev/null)" = '/r/CLAUDE.md session_start' ] ||
  fail "$L: file_path and load_reason must be logged (got: $line)"

printf '%s checks, %s failed\n' "$runs" "$fails"
[ "$fails" -eq 0 ]
