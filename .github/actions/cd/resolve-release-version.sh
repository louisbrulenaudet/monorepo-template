#!/usr/bin/env bash
# Purpose: Derive VERSION and RELEASE_SHA for the deploy from the tag input.
# Target: called by cd.yml after the tag checkout, with TAG, GH_TOKEN, GH_REPO in the environment.
set -euo pipefail
: "${TAG:?TAG is required (vX.Y.Z)}"

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "::error::TAG must be exactly vX.Y.Z, got: $TAG" >&2
  exit 1
fi
# GITHUB_SHA points at the dispatching ref on workflow_dispatch redeploys, not the tag.
sha="$(git rev-parse HEAD)"

# Only main is gated, so a tag cut or moved off main never ships.
status="$(gh api "repos/{owner}/{repo}/compare/main...${sha}" --jq .status)"
if [[ "$status" != identical && "$status" != behind ]]; then
  echo "::error::${TAG} (${sha}) is not on main (compare status: ${status})." >&2
  exit 1
fi

echo "VERSION=${TAG#v}" >> "$GITHUB_ENV"
echo "RELEASE_SHA=${sha}" >> "$GITHUB_ENV"
