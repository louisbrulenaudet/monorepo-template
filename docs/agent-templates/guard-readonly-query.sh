#!/usr/bin/env sh
# Purpose: Restrict the `db-reader` subagent to read-only database queries.
# Target: Claude Code PreToolUse (Bash), wired from the db-reader agent's frontmatter.
# Install to: hooks/db/guard-readonly-query.sh  (chmod +x)
#
# TEMPLATE - ships with docs/agent-templates/db-reader.md. Not wired anywhere until a database
# exists. Verify it blocks a write BEFORE delegating anything real to that agent.
#
# Enforces "Least privilege for model-facing surfaces" and "Privileged client data" (guardrails).
#
# Output contract - two harnesses, one script (mirrors hooks/git/guard-*.sh):
#   Claude Code: exit 2 blocks and stderr carries the reason. stdout is IGNORED on exit 2 and is
#     not injected on PreToolUse, so this script keeps stdout SILENT for Claude.
#   Cursor: failClosed expects a JSON verdict on stdout, so the JSON is emitted only when
#     CURSOR_PROJECT_DIR is set. Claude Code never sets it.
#
# Failure mode: FAIL CLOSED. The trap is installed BEFORE the library is sourced and the fault path
# uses only shell builtins, so a broken PATH yields exit 2 rather than exit 1 (which would not
# block). An unparseable command is DENIED, not allowed.
#
# Why not grep for INSERT|UPDATE|DELETE: `SELECT action FROM audit WHERE action = 'delete'` is a
# legitimate read, and `hooks/git/lib/parse-command.sh` exists precisely because unanchored
# substring matching over a whole command line produced exactly that class of false positive. This
# script instead extracts each SQL statement and checks its LEADING keyword, and denies by default.
#
# Verified against these cases (22/22) before shipping. Re-run them after any edit:
#   ALLOW  wrangler d1 execute DB --command "SELECT count(*) FROM matters"
#   ALLOW  wrangler d1 execute DB --command "SELECT action FROM audit WHERE action = 'delete'"
#   ALLOW  wrangler d1 execute DB --command "PRAGMA table_info(matters)"
#   ALLOW  wrangler d1 execute DB --command "WITH x AS (SELECT 1) SELECT * FROM x"
#   ALLOW  wrangler d1 list                    ALLOW  sqlite3 local.db ".schema matters"
#   ALLOW  ls -la && echo hi                   ALLOW  git commit -m "drop the feature flag"
#   ALLOW  pnpm exec wrangler d1 execute DB --command "SELECT 1"
#   DENY   wrangler d1 execute DB --command "DELETE FROM matters"
#   DENY   wrangler d1 execute DB --command "SELECT 1; DROP TABLE matters"
#   DENY   wrangler d1 execute DB --command "DELETE t"        (no FROM - still a write)
#   DENY   wrangler d1 execute DB --command $'-- ok\nDELETE FROM t'   (comment cannot hide the verb)
#   DENY   wrangler d1 execute DB --file ./migrate.sql
#   DENY   wrangler d1 migrations apply DB     DENY   sqlite3 local.db "drop table t"
#   DENY   drizzle-kit push                    DENY   npx drizzle-kit push
#   DENY   echo ok && wrangler d1 execute DB --command "UPDATE m SET x=1"
#   DENY   pnpm exec wrangler d1 execute DB --command "DELETE FROM t"
#   DENY   pnpm --filter worker-api run wrangler d1 execute DB --command "DROP TABLE t"
#   DENY   mystery-cli --sql "DELETE FROM matters WHERE id=1"   (unknown runner safety net)
#   DENY   empty payload / no command field / malformed JSON / unreadable lib  (fail closed, exit 2)

set -eu
set -f # never glob-expand untrusted command text

# Emitted only for Cursor, whose failClosed mode requires a JSON verdict.
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

# Builtins only: printf is a shell builtin and ${0##*/} needs no basename, so this still reports
# and blocks when PATH is unusable.
emit_fault() {
  trap - EXIT INT TERM HUP
  printf 'guard fault in %s: %s\n' "${0##*/}" "$1" >&2
  cursor_deny_json "guard fault: $1" 2>/dev/null || true
  exit 2
}

trap 'emit_fault "unexpected error"' EXIT INT TERM HUP

# Shared with the git guards: hooks/db/ -> hooks/git/lib/
PC_LIB="${0%/*}/../git/lib/parse-command.sh"
[ -r "$PC_LIB" ] || emit_fault "cannot read $PC_LIB"
. "$PC_LIB"

# Commands that can reach a database. A segment invoking one of these must carry only read-only
# SQL; a segment invoking anything else is not our business and passes through.
is_db_runner() {
  case ${1##*/} in
    wrangler | sqlite3 | psql | mysql | drizzle-kit) return 0 ;;
    *) return 1 ;;
  esac
}

# Subcommands that mutate schema or data regardless of any SQL payload.
has_mutating_subcommand() {
  for a in "$@"; do
    case $a in
      migrations | migrate | push | pull | generate | drop | studio)
        printf '%s' "$a"
        return 0
        ;;
    esac
  done
  return 1
}

# Loose test: does this token mention a SQL verb at all? Used only when a db runner is already
# present in the segment, where high sensitivity is worth an occasional false positive.
token_has_sql_verb() {
  case $1 in
    .schema* | .tables* | .databases*) return 0 ;;
  esac
  printf '%s' "$1" | awk '
    { s = tolower($0) }
    s ~ /(^|[^[:alnum:]_])(select|insert|update|delete|drop|create|alter|truncate|attach|detach|pragma|explain|replace|merge|grant|revoke|vacuum|reindex)([^[:alnum:]_]|$)/ { print "y" }
  ' | grep -q y
}

# Strict test: verb AND a structural keyword. Used as a safety net on segments where no known db
# runner was found, so that an unrecognised runner still cannot smuggle a write through, without
# mistaking ordinary quoted prose for SQL.
looks_like_sql() {
  printf '%s' "$1" | awk '
    { s = tolower($0) }
    s ~ /(^|[^[:alnum:]_])(select|insert|update|delete|drop|create|alter|truncate|attach|replace|merge|grant|revoke)([^[:alnum:]_]|$)/ \
      && s ~ /(^|[^[:alnum:]_])(from|into|table|set|where|values|index|view|database|schema|column)([^[:alnum:]_]|$)/ { print "y" }
  ' | grep -q y
}

# Leading keyword of each `;`-separated SQL statement must be read-only. Anything else - including
# an empty statement list, which means we failed to find the SQL - is a deny.
sql_is_readonly() {
  printf '%s' "$1" | awk '
    BEGIN { RS = ";"; ok = 0 }
    {
      s = $0
      gsub(/^[[:space:]]+/, "", s)
      # Strip a leading line comment or block comment so it cannot hide the verb.
      while (s ~ /^--/ || s ~ /^\/\*/) {
        if (s ~ /^--/)      { sub(/^--[^\n]*\n?/, "", s) }
        else                { sub(/^\/\*([^*]|\*[^\/])*\*\//, "", s) }
        gsub(/^[[:space:]]+/, "", s)
      }
      if (s == "") { next }
      verb = tolower(s)
      sub(/[[:space:](].*$/, "", verb)
      if (verb == "select" || verb == "explain" || verb == "pragma" || verb == "with" \
          || verb == ".schema" || verb == ".tables" || verb == ".databases") {
        ok = 1
        next
      }
      print "BLOCKED:" verb
      exit
    }
    END { if (ok == 0 && NR > 0) { print "BLOCKED:unparsed" } }
  '
}

INPUT=$(cat 2>/dev/null || true)

# No payload means this is not a hook invocation we understand. The git guards allow here because
# they are wired session-wide; this one is wired to a single agent whose only tool is Bash, so it
# fails closed instead.
[ -n "$INPUT" ] || emit_fault "empty hook payload"

command -v jq >/dev/null 2>&1 || emit_fault "jq is required to parse the hook payload; install jq"
command -v awk >/dev/null 2>&1 || emit_fault "awk is required to parse the command; install awk"

CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null || true)
[ -n "$CMD" ] || emit_fault "no command field in hook payload"

REASON=''
SEGS=$(pc_segments "$CMD")
oldifs=$IFS
IFS=$PC_NL
for seg in $SEGS; do
  IFS=$oldifs

  # Tokenise once; the first token is the command word.
  toks=$(pc_tokens "$seg")
  IFS=$PC_NL
  # shellcheck disable=SC2086 # deliberate: newline-split token vector, set -f is on
  set -- $toks
  IFS=$oldifs
  if [ $# -eq 0 ]; then
    IFS=$PC_NL
    continue
  fi

  # A wrapper can bury the real runner anywhere in the argument vector - `pnpm exec wrangler …`,
  # `pnpm --filter api run wrangler …`, `npx -y drizzle-kit …` - so scan EVERY token rather than
  # trusting the command word. An earlier version unwrapped one token at a time and let
  # `pnpm exec wrangler d1 execute --command "DELETE FROM t"` through, because it stopped at `exec`.
  seg_db=0
  for a in "$@"; do
    if is_db_runner "$a"; then
      seg_db=1
      break
    fi
  done

  if [ "$seg_db" -eq 1 ]; then
    if sub=$(has_mutating_subcommand "$@"); then
      REASON="\`$sub\` mutates schema or data"
    fi
  fi

  # The SQL payload is checked whether or not the runner was recognised: a `--command` carrying a
  # write is a write no matter which binary executes it. Sensitivity is higher when a known db
  # runner is present, because a false positive there is harmless for a query-only agent.
  # Denying on "no SQL found" would break legitimate read subcommands such as `wrangler d1 list`,
  # so only actual candidates are verified - and each one must pass.
  if [ -z "$REASON" ]; then
    for a in "$@"; do
      case $a in
        *.sql)
          REASON="a .sql file may contain writes and cannot be verified here"
          ;;
        *)
          if [ "$seg_db" -eq 1 ]; then
            token_has_sql_verb "$a" || continue
          else
            looks_like_sql "$a" || continue
          fi
          verdict=$(sql_is_readonly "$a")
          case $verdict in
            BLOCKED:*) REASON="SQL statement starting with \`${verdict#BLOCKED:}\` is not read-only" ;;
          esac
          ;;
      esac
      [ -z "$REASON" ] || break
    done
  fi

  if [ -n "$REASON" ]; then
    break
  fi
  IFS=$PC_NL
done
IFS=$oldifs

if [ -n "$REASON" ]; then
  emit_deny "Blocked: $REASON. The db-reader agent is read-only by design - see guardrails 'Least privilege for model-facing surfaces'. Only SELECT / EXPLAIN / PRAGMA / WITH…SELECT and sqlite dot-commands are permitted. Migrations and writes are a human decision with a deploy attached; ask the user to run this themselves."
fi
emit_allow
