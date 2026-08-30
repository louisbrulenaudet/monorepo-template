#!/usr/bin/env sh
# Purpose: Claude Code status line - current model, context-window usage, session cost, prompt-cache
#          health, and git branch.
# Target: Claude Code statusLine (receives session JSON on stdin). Wired from .claude/settings.json.
# Canonical location: .claude/status-line.sh - committed, so every clone shares the same status line.
#
# jq preferred; falls back to sed when jq is unavailable (mirrors hooks/git/*.sh robustness pattern).
# Degrades gracefully: missing/null fields render as "n/a" rather than failing the status line.
#
# Cost and cache are here because they are the two numbers that reveal wasted spend: cost makes an
# expensive session visible while it is still running, and a falling cache hit ratio is what a
# re-billed prompt prefix looks like (long idle gaps, or a mid-session /model or /effort switch).

set -u

INPUT=$(cat 2>/dev/null || true)
ROOT="${CLAUDE_PROJECT_DIR:-.}"

if command -v jq >/dev/null 2>&1; then
  MODEL=$(printf '%s' "$INPUT" | jq -r '.model.display_name // .model.id // empty' 2>/dev/null)
  CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // .workspace.current_dir // empty' 2>/dev/null)
  USED_PCT=$(printf '%s' "$INPUT" | jq -r '.context_window.used_percentage // empty' 2>/dev/null)
  CTX_SIZE=$(printf '%s' "$INPUT" | jq -r '.context_window.context_window_size // empty' 2>/dev/null)
  CTX_USED_TOK=$(printf '%s' "$INPUT" | jq -r '.context_window.total_input_tokens // empty' 2>/dev/null)
  COST=$(printf '%s' "$INPUT" | jq -r '.cost.total_cost_usd // empty' 2>/dev/null)
  # hit_ratio is a 0-1 decimal. jq does the percentage so the shell never needs float arithmetic.
  CACHE_PCT=$(printf '%s' "$INPUT" | jq -r 'if .prompt_cache.hit_ratio then (.prompt_cache.hit_ratio * 100 | round) else empty end' 2>/dev/null)
  CACHE_TTL=$(printf '%s' "$INPUT" | jq -r '.prompt_cache.ttl // empty' 2>/dev/null)
else
  # No jq: stick to key names that are unique across the schema. "used_percentage" also
  # appears under rate_limits.five_hour / rate_limits.seven_day, so the percentage is
  # derived below from context_window_size + total_input_tokens instead of matching it
  # directly with sed.
  MODEL=$(printf '%s' "$INPUT" | sed -n 's/.*"display_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  CWD=$(printf '%s' "$INPUT" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  CTX_SIZE=$(printf '%s' "$INPUT" | sed -n 's/.*"context_window_size"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -n 1)
  CTX_USED_TOK=$(printf '%s' "$INPUT" | sed -n 's/.*"total_input_tokens"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -n 1)
  COST=$(printf '%s' "$INPUT" | sed -n 's/.*"total_cost_usd"[[:space:]]*:[[:space:]]*\([0-9.]*\).*/\1/p' | head -n 1)
  # The cache segment is deliberately dropped on this path rather than rendered wrong: hit_ratio is
  # a 0-1 decimal and POSIX sh has no float arithmetic to turn it into a percentage, and "ttl" is
  # too generic a key name to match safely with sed.
  CACHE_PCT=""
  CACHE_TTL=""
fi

[ -z "${MODEL:-}" ] && MODEL="claude"
[ -z "${CWD:-}" ] && CWD="$ROOT"

is_int() {
  case "$1" in
    ''|*[!0-9]*) return 1 ;;
    *) return 0 ;;
  esac
}

is_decimal() {
  case "$1" in
    ''|*[!0-9.]*) return 1 ;;
    *) return 0 ;;
  esac
}

# Context-window usage is the most important signal: how full it is (used %) and how much
# room is left (free tokens). Prefer the schema's own used_percentage when it is available
# (jq path); otherwise derive both figures from context_window_size/total_input_tokens.
# Null/missing fields (no API response yet, or an older CLI without context_window) degrade
# to "n/a" rather than guessing.
CTX="Ctx n/a"
if is_int "${CTX_SIZE:-}" && is_int "${CTX_USED_TOK:-}" && [ "$CTX_SIZE" -gt 0 ]; then
  FREE=$(( CTX_SIZE - CTX_USED_TOK ))
  [ "$FREE" -lt 0 ] && FREE=0

  PCT=""
  is_decimal "${USED_PCT:-}" && PCT=$(printf '%.0f' "$USED_PCT" 2>/dev/null)
  [ -z "$PCT" ] && PCT=$(( (CTX_USED_TOK * 100) / CTX_SIZE ))

  if [ "$FREE" -ge 1000 ]; then
    CTX="Ctx ${PCT}% ($(( FREE / 1000 ))k left)"
  else
    CTX="Ctx ${PCT}% (${FREE} left)"
  fi
elif is_decimal "${USED_PCT:-}"; then
  PCT=$(printf '%.0f' "$USED_PCT" 2>/dev/null)
  [ -z "$PCT" ] && PCT="$USED_PCT"
  CTX="Ctx ${PCT}%"
fi

# Cost and cache are appended only when the session actually reported them. Unlike the context
# window they are not worth an "n/a" placeholder - a missing segment is quieter than a wrong one,
# and both are absent before the first API response of a session.
COST_SEG=""
if is_decimal "${COST:-}"; then
  COST_SEG=$(printf '$%.2f' "$COST" 2>/dev/null)
fi

CACHE_SEG=""
if is_int "${CACHE_PCT:-}"; then
  CACHE_SEG="cache ${CACHE_PCT}%"
  case "${CACHE_TTL:-}" in
    ''|null) ;;
    *) CACHE_SEG="${CACHE_SEG} ${CACHE_TTL}" ;;
  esac
fi

# Current git branch, skipping optional locks so this never blocks on a concurrent git process.
BRANCH=""
if command -v git >/dev/null 2>&1 && git -C "$CWD" --no-optional-locks rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  BRANCH=$(git -C "$CWD" --no-optional-locks branch --show-current 2>/dev/null)
  [ -z "$BRANCH" ] && BRANCH=$(git -C "$CWD" --no-optional-locks rev-parse --short HEAD 2>/dev/null)
fi

OUT="$MODEL | $CTX"
[ -n "$COST_SEG" ] && OUT="$OUT | $COST_SEG"
[ -n "$CACHE_SEG" ] && OUT="$OUT | $CACHE_SEG"
[ -n "$BRANCH" ] && OUT="$OUT | $BRANCH"
printf '%s\n' "$OUT"
