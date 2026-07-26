#!/usr/bin/env sh
# Purpose: Format an edited JS/TS file, then lint the formatted result.
# Target: Cursor afterFileEdit and Claude Code PostToolUse (Edit|Write).
# Canonical location: hooks/quality/ - wired from .cursor/hooks.json and .claude/settings.json.
#
# Post-edit hooks provide feedback; they cannot roll back an edit that already
# succeeded. Exit 2 here surfaces the lint diagnostics to the agent as stderr;
# the edit itself stands.
#
# Accepts Cursor afterFileEdit ({file_path}) and tool payloads ({tool_input.file_path} / {file_path}).
#
# Exit code contract: the FORMAT leg is advisory and must never decide the
# outcome, so its status is discarded explicitly. The LINT leg is authoritative
# and its exit code becomes this script's - exit 2 when oxlint reports problems,
# 0 otherwise. `set -e` is deliberately NOT used: it would let a formatter
# hiccup pre-empt the lint pass that the agent actually needs to see.

set -u

INPUT=$(cat 2>/dev/null || true)
SCRIPT_DIR=${0%/*}

printf '%s' "$INPUT" | sh "$SCRIPT_DIR/format-changed.sh" || true
printf '%s' "$INPUT" | sh "$SCRIPT_DIR/lint-changed.sh"
