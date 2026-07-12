#!/usr/bin/env sh
# Purpose: Format an edited JS/TS file, then lint the formatted result.
# Target: Cursor postToolUse (Write) and Claude Code PostToolUse (Edit|Write).
# Canonical location: hooks/quality/ - wired from .cursor/hooks.json and .claude/settings.json.
#
# Post-tool hooks provide feedback; they cannot roll back an edit that already succeeded.

INPUT=$(cat 2>/dev/null || true)
SCRIPT_DIR=$(dirname "$0")

printf '%s' "$INPUT" | sh "$SCRIPT_DIR/format-changed.sh"
printf '%s' "$INPUT" | sh "$SCRIPT_DIR/lint-changed.sh"
