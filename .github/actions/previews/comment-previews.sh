#!/usr/bin/env bash
# Purpose: create or update the single Worker Previews comment on a pull request.
# Target: preview.yml with GH_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA,
# PREVIEW_NAME, and PREVIEW_URLS_FILE (written by deploy-previews.sh).
set -euo pipefail
: "${PR_NUMBER:?PR_NUMBER is required}"
: "${HEAD_SHA:?HEAD_SHA is required}"
: "${PREVIEW_NAME:?PREVIEW_NAME is required}"
: "${PREVIEW_URLS_FILE:?PREVIEW_URLS_FILE is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"

marker="<!-- worker-previews -->"

body="$(
  printf '%s\n' "$marker" "### Worker Previews" "" \
    "Preview \`${PREVIEW_NAME}\` at \`${HEAD_SHA}\`. Deleted when this PR closes." "" \
    "| App | Preview URL |" "| --- | --- |"
  while IFS=$'\t' read -r app url; do
    [ -n "$app" ] && printf '| `%s` | %s |\n' "$app" "$url"
  done < "$PREVIEW_URLS_FILE"
)"

comment_id="$(
  gh api --paginate "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
    --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | startswith(\"${marker}\"))) | .id" |
    head -n 1
)"

if [ -n "$comment_id" ]; then
  gh api --method PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" -f body="$body" > /dev/null
else
  gh api --method POST "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" -f body="$body" > /dev/null
fi
