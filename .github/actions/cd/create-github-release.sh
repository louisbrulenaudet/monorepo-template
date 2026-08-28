#!/usr/bin/env bash
# Purpose: Create or update the GitHub Release for the deployed tag, with both
# Workers' version ids and the matching CHANGELOG sections in the notes.
# Target: called by cd.yml with GH_TOKEN and the guarded variables below.
set -euo pipefail
: "${TAG:?TAG is required (vX.Y.Z)}"
: "${VERSION:?VERSION is required (X.Y.Z)}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"
: "${VITE_API_BASE_URL:?VITE_API_BASE_URL is required}"
: "${WORKER_API_VERSION_ID:?WORKER_API_VERSION_ID is required}"
: "${FRONT_APP_VERSION_ID:?FRONT_APP_VERSION_ID is required}"

notes="$(mktemp)"
{
  echo "Deployed \`worker-api\` and \`front-app\` @ \`${VERSION}\` to production."
  echo
  echo "- Commit: ${RELEASE_SHA}"
  echo "- worker-api version id: \`${WORKER_API_VERSION_ID}\`"
  echo "- front-app version id: \`${FRONT_APP_VERSION_ID}\`"
  echo "- URL: ${VITE_API_BASE_URL}"
  for app in worker-api front-app; do
    changelog="apps/${app}/CHANGELOG.md"
    [ -f "$changelog" ] || continue
    excerpt="$(
      awk -v ver="$VERSION" '
        $0 == "## " ver { flag = 1; next }
        /^## / && flag { exit }
        flag { print }
      ' "$changelog"
    )"
    [[ -n "${excerpt//[[:space:]]/}" ]] || continue
    echo
    echo "### ${app}"
    echo "$excerpt"
  done
} > "$notes"

if gh release view "$TAG" > /dev/null 2>&1; then
  gh release edit "$TAG" --title "$TAG" --notes-file "$notes"
else
  gh release create "$TAG" --title "$TAG" --notes-file "$notes" --verify-tag
fi
