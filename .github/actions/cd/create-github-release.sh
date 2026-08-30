#!/usr/bin/env bash
# Purpose: Create or update the GitHub Release for the deployed tag.
# Target: called by cd.yml with GH_TOKEN and the guarded variables below.
set -euo pipefail
: "${TAG:?TAG is required (vX.Y.Z)}"
: "${VERSION:?VERSION is required (X.Y.Z)}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"
: "${VITE_API_BASE_URL:?VITE_API_BASE_URL is required}"
: "${VERSION_IDS_FILE:?VERSION_IDS_FILE is required (exported by upload-versions.sh)}"

deployed=""
while IFS=$'\t' read -r app _dir _version_id; do
  deployed+="\`${app}\`, "
done < "$VERSION_IDS_FILE"

notes="$(mktemp)"
{
  echo "Deployed ${deployed%, } @ \`${VERSION}\` to production."
  echo
  echo "- Commit: ${RELEASE_SHA}"
  while IFS=$'\t' read -r app _dir version_id; do
    echo "- ${app} version id: \`${version_id}\`"
  done < "$VERSION_IDS_FILE"
  echo "- URL: ${VITE_API_BASE_URL}"
  while IFS=$'\t' read -r app dir _version_id; do
    changelog="apps/${dir}/CHANGELOG.md"
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
  done < "$VERSION_IDS_FILE"
} > "$notes"

if gh release view "$TAG" > /dev/null 2>&1; then
  gh release edit "$TAG" --title "$TAG" --notes-file "$notes"
else
  gh release create "$TAG" --title "$TAG" --notes-file "$notes" --verify-tag
fi
