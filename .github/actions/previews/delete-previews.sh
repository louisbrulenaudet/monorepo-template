#!/usr/bin/env bash
# Purpose: delete the Worker Preview named PREVIEW_NAME (default: current branch) from
# every app under apps/.
# Target: preview.yml on a closed PR, and `pnpm preview:delete` locally.
#
# Every app is attempted even when one fails, so one run reports every leftover.
# `--config wrangler.jsonc` bypasses a local Vite build's redirected config: one built
# without CLOUDFLARE_ENV would silently point the delete at the top-level Worker.
set -euo pipefail
# shellcheck source=./lib.sh
. "$(dirname "$0")/lib.sh"

name="$(resolve_preview_name)"
apps="$(node .github/actions/lib/list-apps.mjs)"

failed=()
while IFS=$'\t' read -r app _; do
  if ! pnpm --filter="$app" exec wrangler preview delete --config wrangler.jsonc \
    --env "$PREVIEW_ENV" --name "$name" --skip-confirmation < /dev/null; then
    failed+=("$app")
  fi
done <<< "$apps"

if [ ${#failed[@]} -gt 0 ]; then
  echo "::error::Deleting Preview '${name}' failed for ${failed[*]}." >&2
  exit 1
fi
