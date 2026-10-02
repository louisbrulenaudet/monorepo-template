#!/usr/bin/env bash
set -euo pipefail
: "${TAG:?TAG is required (vX.Y.Z)}"
: "${VERSION:?VERSION is required (X.Y.Z)}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"
: "${VITE_API_BASE_URL:?VITE_API_BASE_URL is required}"
: "${VERSION_IDS_FILE:?VERSION_IDS_FILE is required (exported by upload-versions.sh)}"

deployed=""
ids=()
sections=()
while IFS=$'\t' read -r app dir version_id _worker_name; do
  deployed+="\`${app}\`, "
  ids+=("- ${app} version id: \`${version_id}\`")
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
  [[ "$(echo "$excerpt" | sed '/^[[:space:]]*$/d')" != "No changes in this release." ]] || continue
  sections+=("" "### ${app}" "$excerpt")
done < "$VERSION_IDS_FILE"

notes="$(mktemp)"
{
  echo "Deployed ${deployed%, } @ \`${VERSION}\` to production."
  echo
  echo "- Commit: ${RELEASE_SHA}"
  printf '%s\n' "${ids[@]}"
  echo "- URL: ${VITE_API_BASE_URL}"
  [ ${#sections[@]} -eq 0 ] || printf '%s\n' "${sections[@]}"
} > "$notes"

if gh release view "$TAG" > /dev/null 2>&1; then
  gh release edit "$TAG" --title "$TAG" --notes-file "$notes"
else
  gh release create "$TAG" --title "$TAG" --notes-file "$notes" --verify-tag
fi
