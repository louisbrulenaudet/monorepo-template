#!/usr/bin/env sh

set -u

cat >/dev/null 2>&1 || true
ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"
cd "$ROOT" 2>/dev/null || exit 0

NL=$(printf '\nx')
NL=${NL%x}
NOTES=""
note() {
  NOTES="${NOTES}- $1${NL}"
}

INSTALL='`pnpm install --frozen-lockfile --prefer-offline`'
if [ ! -e node_modules/.pnpm-workspace-state-v1.json ]; then
  note "This checkout has no pnpm install (a fresh worktree?). Run ${INSTALL} before any pnpm script or turbo task."
elif [ pnpm-lock.yaml -nt node_modules/.pnpm-workspace-state-v1.json ]; then
  note "pnpm-lock.yaml changed after the last install. Run ${INSTALL} before trusting test or type-check results."
fi

if command -v jq >/dev/null 2>&1; then
  for manifest in apps/*/package.json; do
    [ -f "$manifest" ] || continue
    APP_DIR=${manifest%/package.json}
    [ -f "$APP_DIR/cloudflare.config.ts" ] || continue
    jq -e '.scripts.types' "$manifest" >/dev/null 2>&1 || continue
    if [ ! -f "$APP_DIR/.cloudflare/types/index.d.ts" ]; then
      note "${APP_DIR#apps/} has no .cloudflare/types/index.d.ts yet. Run \`pnpm types\` before trusting \`Env\` errors from tsc, lint, or the LSP."
    fi
  done
fi

if command -v jq >/dev/null 2>&1 && command -v lsof >/dev/null 2>&1; then
  for manifest in apps/*/package.json; do
    [ -f "$manifest" ] || continue
    APP_PORT=$(jq -r 'select(.monorepo.devPort != null) | "\(.name) \(.monorepo.devPort)"' "$manifest" 2>/dev/null)
    [ -n "$APP_PORT" ] || continue
    APP=${APP_PORT% *}
    PORT=${APP_PORT#* }
    if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
      note "Port ${PORT} (${APP} dev) is already listening, probably a dev server left by another session. Reuse it or stop it: anything else that binds ${PORT} fails, and workerd hangs instead of exiting."
    fi
  done
fi

[ -n "$NOTES" ] || exit 0
TEXT="Session checks:${NL}${NOTES}"
if [ -n "${CURSOR_PROJECT_DIR:-}" ]; then
  command -v jq >/dev/null 2>&1 || exit 0
  jq -nc --arg c "$TEXT" '{additional_context: $c}'
  exit 0
fi
printf '%s' "$TEXT"
exit 0
