#!/usr/bin/env sh

set -u

INPUT=$(cat 2>/dev/null || true)
SCRIPT_DIR=${0%/*}

printf '%s' "$INPUT" | sh "$SCRIPT_DIR/format-changed.sh" || true
printf '%s' "$INPUT" | sh "$SCRIPT_DIR/lint-changed.sh"
