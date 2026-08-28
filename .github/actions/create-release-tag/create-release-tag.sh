#!/usr/bin/env bash
# Purpose: Tag the current commit vX.Y.Z, idempotently, via the GitHub API.
# Target: called by action.yml; gh resolves {owner}/{repo} placeholders from GH_REPO.
set -euo pipefail
: "${GH_REPO:?GH_REPO is required (owner/repo)}"
: "${VERSION:?VERSION is required (X.Y.Z)}"

tag="v${VERSION}"
echo "tag=${tag}" >> "$GITHUB_OUTPUT"

# 2xx = tag exists (skip), 404 = create, anything else fails rather than guessing.
if lookup="$(gh api "repos/{owner}/{repo}/git/ref/tags/${tag}" 2>&1)"; then
  echo "Tag ${tag} already exists; nothing to release."
  echo "created=false" >> "$GITHUB_OUTPUT"
  exit 0
fi
if [[ "$lookup" != *"(HTTP 404)"* ]]; then
  echo "::error::Existence probe for ${tag} failed (not a 404); refusing to guess." >&2
  printf '%s\n' "$lookup" >&2
  exit 1
fi

echo "Creating tag ${tag} at ${GITHUB_SHA}"
gh api "repos/{owner}/{repo}/git/refs" \
  -f "ref=refs/tags/${tag}" \
  -f "sha=${GITHUB_SHA}"
echo "created=true" >> "$GITHUB_OUTPUT"
