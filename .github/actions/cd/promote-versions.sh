#!/usr/bin/env bash
# Purpose: promote every uploaded version to 100%.
# Target: called by cd.yml with VERSION_IDS_FILE and the Cloudflare credentials.
set -euo pipefail
: "${VERSION_IDS_FILE:?VERSION_IDS_FILE is required (exported by upload-versions.sh)}"

promoted=()
while IFS=$'\t' read -r app _dir version_id; do
  if pnpm --filter="$app" run promote -- "${version_id}@100%" --yes < /dev/null; then
    promoted+=("$app")
    continue
  fi
  if [ ${#promoted[@]} -gt 0 ]; then
    rollback="$(printf 'pnpm --filter=%s exec wrangler rollback --env production; ' "${promoted[@]}")"
    echo "::error::${app} deploy failed after ${promoted[*]} went live at 100%. Roll back with: ${rollback% }" >&2
  else
    echo "::error::${app} deploy failed; no app reached 100%." >&2
  fi
  exit 1
done < "$VERSION_IDS_FILE"

if [ ${#promoted[@]} -eq 0 ]; then
  echo "::error::${VERSION_IDS_FILE} listed no apps to promote" >&2
  exit 1
fi
