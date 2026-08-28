#!/usr/bin/env bash
# Purpose: wrangler versions upload for one app, emitting its new version id.
# Target: called by cd.yml with APP, VERSION, RELEASE_SHA, and the Cloudflare
# credentials in the environment; writes version-id to GITHUB_OUTPUT.
set -euo pipefail
: "${APP:?APP is required (worker-api | front-app)}"
: "${VERSION:?VERSION is required (X.Y.Z)}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"

# When wrangler.jsonc gains routes/custom domains/cron triggers, also run:
#   pnpm --filter="$APP" exec wrangler triggers deploy --env production
out="$(mktemp)"
WRANGLER_OUTPUT_FILE_PATH="$out" pnpm --filter="$APP" run upload -- \
  --strict --tag "$VERSION" --message "release $VERSION (${RELEASE_SHA})"
version_id="$(jq -r -s 'map(select(.type == "version-upload" and .version_id)) | last | .version_id' "$out")"
if [ -z "$version_id" ] || [ "$version_id" = "null" ]; then
  echo "::error::wrangler versions upload did not emit version-upload.version_id" >&2
  exit 1
fi
echo "version-id=${version_id}" >> "$GITHUB_OUTPUT"
