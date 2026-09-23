# Purpose: shared helpers for deploy-previews.sh and delete-previews.sh (sourced).

# Every Preview command must carry the same --env: without it, wrangler targets
# the top-level Worker instead of the production Worker the Previews live under.
PREVIEW_ENV="production"

# Prints PREVIEW_NAME when set, else the current branch as a DNS-safe slug. The
# Preview URL is <name>-<worker>-production.<subdomain>.workers.dev, and a DNS
# label caps at 63 characters, so the slug is kept short.
resolve_preview_name() {
  if [ -n "${PREVIEW_NAME:-}" ]; then
    printf '%s' "$PREVIEW_NAME"
    return
  fi
  local branch slug
  branch="$(git rev-parse --abbrev-ref HEAD)"
  case "$branch" in
    main | HEAD)
      echo "::error::Refusing to derive a Preview name from '${branch}'; set PREVIEW_NAME or switch to a feature branch." >&2
      return 1
      ;;
  esac
  slug="$(printf '%s' "$branch" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9-]+/-/g; s/^-+//' | cut -c1-30 | sed -E 's/-+$//')"
  : "${slug:?could not derive a Preview name from branch ${branch}}"
  printf '%s' "$slug"
}
