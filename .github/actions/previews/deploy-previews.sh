#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=./lib.sh
. "$(dirname "$0")/lib.sh"

name="$(resolve_preview_name)"
apps="$(node .github/actions/lib/list-apps.mjs)"

cf_preview() {
  local app="$1" out url
  out="$(NO_COLOR=1 pnpm --filter="$app" exec cf previews deploy "$name" --prebuilt --mode "$PREVIEW_MODE" < /dev/null)" || return
  printf '%s\n' "$out" >&2
  url="$(jq -r 'select(.type == "preview") | .preview_urls[0] // empty' <<< "$out")"
  if [ -z "$url" ]; then
    echo "::error::${app} Preview '${name}' was deployed but has no URL. previewUrls in cloudflare.config.ts takes effect through \`cf deploy\` / \`cf workers triggers deploy\`, never \`cf workers versions create\`: run \`pnpm --filter=${app} exec cf workers triggers deploy --mode ${PREVIEW_MODE}\` once." >&2
    return 1
  fi
  printf '%s' "$url"
}

gateway_url=""
smoke_args=()
rows=()
while IFS=$'\t' read -r app _dir role health_path; do
  echo "::group::cf previews deploy ${app} (${name})"
  build_env=(CLOUDFLARE_PREVIEW_BUILD=true)
  if [ "$role" = "frontend" ]; then
    : "${gateway_url:?no http-gateway Preview exists yet - a frontend needs its URL as VITE_API_BASE_URL}"
    build_env+=(VITE_API_BASE_URL="$gateway_url" VITE_APP_ENVIRONMENT=preview NODE_ENV=production)
  fi
  env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID -u CF_ACCESS_CLIENT_ID -u CF_ACCESS_CLIENT_SECRET \
    "${build_env[@]}" pnpm --filter="$app" exec cf build --mode "$PREVIEW_MODE" < /dev/null
  url="$(cf_preview "$app")"
  echo "::endgroup::"
  [ "$role" = "http-gateway" ] && gateway_url="$url"
  [ "$health_path" = "-" ] || smoke_args+=(--url "${app}=${url}")
  rows+=("| \`${app}\` | ${url} |")
done <<< "$apps"

table="$(printf '%s\n' "| App | Preview URL |" "| --- | --- |" "${rows[@]}")"
printf '%s\n' "$table"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  delimiter="EOF_$(openssl rand -hex 16)"
  {
    printf 'body<<%s\n' "$delimiter"
    printf '%s\n' "### Worker Previews" "" \
      "Preview \`${name}\` at \`${HEAD_SHA:?HEAD_SHA is required in Actions}\`. Deleted when this PR closes." "" "$table"
    printf '%s\n' "$delimiter"
  } >> "$GITHUB_OUTPUT"
fi

[ ${#smoke_args[@]} -eq 0 ] || node .github/actions/lib/smoke.mjs "${smoke_args[@]}"
