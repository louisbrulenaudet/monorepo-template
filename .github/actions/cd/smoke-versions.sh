#!/usr/bin/env bash
# Purpose: probe the promoted release over public HTTP.
# Target: called by cd.yml with VITE_API_BASE_URL.
#
# CD knows exactly one production origin - VITE_API_BASE_URL, the gateway's - so only the
# gateway is probed. Every other app declaring a public `monorepo.healthPath` is named as
# unverified instead of passed over in silence; give CD its origin to close that gap.
set -euo pipefail
: "${VITE_API_BASE_URL:?VITE_API_BASE_URL is required - the gateway origin and smoke target}"

probes="$(
  node -e '
import("./.github/actions/lib/apps.mjs").then(({ readApps }) => {
  for (const app of readApps()) {
    if (app.healthPath !== null) {
      process.stdout.write(`${app.name}\t${app.role}\t${app.healthPath}\n`);
    }
  }
});
'
)"

smoked=""
while IFS=$'\t' read -r app role health_path; do
  [ -n "$app" ] || continue
  if [ "$role" = "http-gateway" ]; then
    curl --fail --silent --show-error --max-time 30 "${VITE_API_BASE_URL}${health_path}"
    smoked="$app"
  else
    echo "::notice::${app} promoted to 100% but not smoked - CD has no production origin for it, only the gateway's VITE_API_BASE_URL."
  fi
done <<< "$probes"

if [ -z "$smoked" ]; then
  echo "::error::No app declares monorepo.role http-gateway with a non-null healthPath; nothing was smoked after promoting to 100%." >&2
  exit 1
fi
