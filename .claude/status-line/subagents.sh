#!/usr/bin/env sh
# Claude Code subagentStatusLine (rows JSON on stdin): one {"id","content"} line per subagent row.
# No output, jq missing included, keeps the default rows.

DIR=${0%/*}
[ "$DIR" = "$0" ] && DIR=.

jq -c -f "$DIR/subagents.jq" 2>/dev/null || exit 0
