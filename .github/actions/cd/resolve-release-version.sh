#!/usr/bin/env bash
# Purpose: Derive VERSION and RELEASE_SHA for the deploy from the tag input.
# Target: called by cd.yml after the tag checkout, with TAG in the environment.
set -euo pipefail
: "${TAG:?TAG is required (vX.Y.Z)}"

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "::error::TAG must be exactly vX.Y.Z, got: $TAG" >&2
  exit 1
fi
echo "VERSION=${TAG#v}" >> "$GITHUB_ENV"
# GITHUB_SHA points at the dispatching ref on workflow_dispatch redeploys, not the tag.
echo "RELEASE_SHA=$(git rev-parse HEAD)" >> "$GITHUB_ENV"
