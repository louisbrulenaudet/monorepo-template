#!/usr/bin/env bash
# Purpose: create or update a Worker Preview of every app under apps/, then smoke it.
# Target: preview.yml (PREVIEW_NAME=pr-<N>) and `pnpm preview:deploy` locally, where
# PREVIEW_NAME defaults to the current branch. Needs CLOUDFLARE_API_TOKEN and
# CLOUDFLARE_ACCOUNT_ID, or a `wrangler login` session.
#
# Order is monorepo.deployOrder, and it is load-bearing: a frontend is built only
# after the gateway Preview exists, because its VITE_API_BASE_URL is that Preview's
# URL. The build runs with the Cloudflare credentials unset.
set -euo pipefail
# shellcheck source=./lib.sh
. "$(dirname "$0")/lib.sh"

name="$(resolve_preview_name)"
message="${PREVIEW_MESSAGE:-$(git rev-parse --short HEAD)}"
urls_file="${PREVIEW_URLS_FILE:-$(mktemp)}"
: > "$urls_file"
apps="$(node .github/actions/lib/list-apps.mjs)"

curl_access=()
if [ -n "${CF_ACCESS_CLIENT_ID:-}" ] && [ -n "${CF_ACCESS_CLIENT_SECRET:-}" ]; then
  curl_access=(-H "CF-Access-Client-Id: ${CF_ACCESS_CLIENT_ID}" -H "CF-Access-Client-Secret: ${CF_ACCESS_CLIENT_SECRET}")
fi

# Reads the versioned `type: "preview"` record from WRANGLER_OUTPUT_FILE_PATH, as
# upload-versions.sh does for uploads, instead of parsing `--json` stdout.
wrangler_preview() {
  local app="$1" out url
  out="$(mktemp)"
  WRANGLER_OUTPUT_FILE_PATH="$out" pnpm --filter="$app" exec wrangler preview \
    --env "$PREVIEW_ENV" --name "$name" --message "$message" < /dev/null >&2
  url="$(jq -r -s 'map(select(.type == "preview")) | last | .preview_urls[0] // empty' "$out")"
  if [ -z "$url" ]; then
    echo "::error::${app} Preview '${name}' was deployed but has no URL. workers.dev Preview URLs are applied by \`wrangler deploy\` / \`wrangler triggers deploy\`, never by \`versions upload\`: run \`pnpm --filter=${app} exec wrangler triggers deploy --config wrangler.jsonc --env ${PREVIEW_ENV}\` once." >&2
    return 1
  fi
  printf '%s' "$url"
}

# Prints the HTTP status and leaves the body in $2. Retries only while the hostname
# is not serving the Worker yet (no connection, 404, 52x); any other status is the
# Worker's own answer.
probe() {
  local url="$1" body_file="$2" attempt status
  for attempt in 1 2 3 4 5 6; do
    status="$(curl --silent --max-time 20 --output "$body_file" --write-out '%{http_code}' \
      ${curl_access[@]+"${curl_access[@]}"} "$url" || true)"
    case "$status" in
      000 | 404 | 52?) [ "$attempt" -lt 6 ] && sleep 5 ;;
      *) break ;;
    esac
  done
  printf '%s' "$status"
}

smoke() {
  local app="$1" role="$2" url="$3" health_path="$4" body_file status
  [ "$health_path" = "-" ] && return 0
  body_file="$(mktemp)"
  status="$(probe "${url}${health_path}" "$body_file")"
  if [ "$status" = "200" ]; then
    case "$role" in
      http-gateway) jq -e '.status and .version' "$body_file" > /dev/null 2>&1 && return 0 ;;
      frontend) grep -q 'id="root"' "$body_file" && return 0 ;;
      *) return 0 ;;
    esac
  fi

  echo "::error::${app} Preview smoke failed: HTTP ${status} at ${url}${health_path}" >&2
  head -c 500 "$body_file" >&2
  echo >&2
  if [ "$role" = "http-gateway" ] && [ "$status" = "503" ]; then
    echo "::error::A gateway 503 is the fail-closed CORS guard: set env.production.previews.vars.CORS_ORIGINS in apps/${app}/wrangler.jsonc (e.g. https://*-front-app-production.<subdomain>.workers.dev, the subdomain is in the URL above)." >&2
  elif [ "$status" = "302" ] || [ "$status" = "403" ]; then
    echo "::error::Cloudflare Access is blocking the probe: set CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET to an Access service token." >&2
  fi
  return 1
}

gateway_url=""
while IFS=$'\t' read -r app _dir role health_path; do
  echo "::group::wrangler preview ${app} (${name})"
  if [ "$role" = "frontend" ]; then
    : "${gateway_url:?no http-gateway Preview exists yet - a frontend needs its URL as VITE_API_BASE_URL}"
    # --only: the type-check gate belongs to ci.yml; this build only needs dist/.
    env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID \
      VITE_API_BASE_URL="$gateway_url" VITE_APP_ENVIRONMENT=preview \
      CLOUDFLARE_ENV="$PREVIEW_ENV" NODE_ENV=production \
      pnpm turbo run build --filter="$app" --only < /dev/null
  fi
  url="$(wrangler_preview "$app")"
  echo "::endgroup::"
  echo "${app}: ${url}"
  [ "$role" = "http-gateway" ] && gateway_url="$url"
  smoke "$app" "$role" "$url" "$health_path"
  printf '%s\t%s\n' "$app" "$url" >> "$urls_file"
done <<< "$apps"
