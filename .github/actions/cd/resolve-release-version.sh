#!/usr/bin/env bash
set -euo pipefail
: "${TAG:?TAG is required (vX.Y.Z)}"

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "::error::TAG must be exactly vX.Y.Z, got: $TAG" >&2
  exit 1
fi
# GITHUB_SHA points at the dispatching ref on workflow_dispatch redeploys, not the tag.
sha="$(git rev-parse HEAD)"

status="$(gh api "repos/{owner}/{repo}/compare/main...${sha}" --jq .status)"
if [[ "$status" != identical && "$status" != behind ]]; then
  echo "::error::${TAG} (${sha}) is not on main (compare status: ${status})." >&2
  exit 1
fi

echo "VERSION=${TAG#v}" >> "$GITHUB_ENV"
echo "RELEASE_SHA=${sha}" >> "$GITHUB_ENV"
