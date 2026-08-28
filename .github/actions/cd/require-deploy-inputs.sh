#!/usr/bin/env bash
# Purpose: Fail the deploy before any install/build work when credentials or the
# front-app origin are missing, with a named message instead of wrangler's auth error.
# Target: called by cd.yml.
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?required for CD - a production GitHub Environment secret}"
: "${CLOUDFLARE_ACCOUNT_ID:?required for CD - a production GitHub Environment secret}"
: "${VITE_API_BASE_URL:?repository variable required for front-app}"
