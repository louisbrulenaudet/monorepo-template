#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=./lib.sh
. "$(dirname "$0")/lib.sh"

name="$(resolve_preview_name)"
apps="$(node .github/actions/lib/list-apps.mjs)"

failed=()
while IFS=$'\t' read -r app _; do
  if ! pnpm exec wrangler preview delete --worker-name "${app}-production" \
    --name "$name" -y < /dev/null; then
    failed+=("$app")
  fi
done <<< "$apps"

if [ ${#failed[@]} -gt 0 ]; then
  echo "::error::Deleting Preview '${name}' failed for ${failed[*]}." >&2
  exit 1
fi
