#!/usr/bin/env bash
# Purpose: wrangler versions upload for every app under apps/.
# Target: called by cd.yml with VERSION, RELEASE_SHA, and the Cloudflare
# credentials in the environment; writes a name/dir/version-id table and exports
# VERSION_IDS_FILE for the promote and release-notes steps.
set -euo pipefail
: "${VERSION:?VERSION is required (X.Y.Z)}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"

version_ids="${RUNNER_TEMP:?RUNNER_TEMP is required}/version-ids.tsv"
: > "$version_ids"

apps="$(node .github/actions/cd/list-apps.mjs)"
while IFS=$'\t' read -r app dir; do
  out="$(mktemp)"
  # When wrangler.jsonc gains routes/custom domains/cron triggers, also run:
  #   pnpm --filter="$app" exec wrangler triggers deploy --env production
  WRANGLER_OUTPUT_FILE_PATH="$out" pnpm --filter="$app" run upload -- \
    --strict --tag "$VERSION" --message "release $VERSION (${RELEASE_SHA})" < /dev/null
  version_id="$(jq -r -s 'map(select(.type == "version-upload" and .version_id)) | last | .version_id' "$out")"
  if [ -z "$version_id" ] || [ "$version_id" = "null" ]; then
    echo "::error::wrangler versions upload did not emit version-upload.version_id for ${app}" >&2
    exit 1
  fi
  printf '%s\t%s\t%s\n' "$app" "$dir" "$version_id" >> "$version_ids"
done <<< "$apps"

echo "VERSION_IDS_FILE=${version_ids}" >> "$GITHUB_ENV"
