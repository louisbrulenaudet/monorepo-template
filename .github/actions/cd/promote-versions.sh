#!/usr/bin/env bash
set -euo pipefail
: "${VERSION_IDS_FILE:?VERSION_IDS_FILE is required (exported by upload-versions.sh)}"

promoted=()
workers=()
while IFS=$'\t' read -r app _dir version_id worker_name; do
  versions="$(printf '[{"version_id":"%s","percentage":100}]' "$version_id")"
  if pnpm --filter="$app" exec cf workers deployments create --worker "$worker_name" \
    --strategy percentage --versions "$versions" < /dev/null; then
    promoted+=("$app")
    workers+=("$worker_name")
    continue
  fi
  if [ ${#promoted[@]} -gt 0 ]; then
    lists=""
    for i in "${!promoted[@]}"; do
      lists+="pnpm --filter=${promoted[$i]} exec cf workers deployments list --worker ${workers[$i]}; "
    done
    echo "::error::${app} deploy failed after ${promoted[*]} went live at 100%. Roll each back to its previous version id (${lists%; }) with: pnpm --filter=<app> exec cf workers deployments create --worker <worker> --strategy percentage --versions '[{\"version_id\":\"<previous id>\",\"percentage\":100}]'" >&2
  else
    echo "::error::${app} deploy failed; no app reached 100%." >&2
  fi
  exit 1
done < "$VERSION_IDS_FILE"

if [ ${#promoted[@]} -eq 0 ]; then
  echo "::error::${VERSION_IDS_FILE} listed no apps to promote" >&2
  exit 1
fi
