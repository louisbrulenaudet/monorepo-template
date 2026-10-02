#!/usr/bin/env bash
set -euo pipefail
: "${VERSION:?VERSION is required (X.Y.Z)}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"

version_ids="${RUNNER_TEMP:?RUNNER_TEMP is required}/version-ids.tsv"
: > "$version_ids"

apps="$(node .github/actions/lib/list-apps.mjs)"

names=()
dirs=()
outs=()
logs=()
pids=()
while IFS=$'\t' read -r app dir _; do
  [ -n "$app" ] || continue
  out="$(mktemp)"
  log="$(mktemp)"
  names+=("$app")
  dirs+=("$dir")
  outs+=("$out")
  logs+=("$log")
  WRANGLER_OUTPUT_FILE_PATH="$out" pnpm --filter="$app" run upload \
    --tag "$VERSION" --message "release $VERSION (${RELEASE_SHA})" \
    < /dev/null > "$log" 2>&1 &
  pids+=("$!")
done <<< "$apps"

failed=()
for i in "${!pids[@]}"; do
  wait "${pids[$i]}" || failed+=("${names[$i]}")
done

for i in "${!names[@]}"; do
  echo "::group::cf workers versions create ${names[$i]}"
  cat "${logs[$i]}"
  echo "::endgroup::"
done

if [ ${#failed[@]} -gt 0 ]; then
  echo "::error::cf workers versions create failed for ${failed[*]}; no app was promoted." >&2
  exit 1
fi

for i in "${!names[@]}"; do
  record="$(jq -r -s 'map(select(.type == "version-upload" and ((.version_id // "") != "") and ((.worker_name // "") != ""))) | last // empty | "\(.version_id)\t\(.worker_name)"' "${outs[$i]}")"
  if [ -z "$record" ]; then
    echo "::error::cf workers versions create did not emit a version-upload record with version_id and worker_name for ${names[$i]}" >&2
    exit 1
  fi
  printf '%s\t%s\t%s\n' "${names[$i]}" "${dirs[$i]}" "$record" >> "$version_ids"
done

echo "VERSION_IDS_FILE=${version_ids}" >> "$GITHUB_ENV"
