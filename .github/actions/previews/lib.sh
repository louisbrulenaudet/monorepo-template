# cloudflare.config.ts accepts a Preview only under production, the Worker Previews live under.
PREVIEW_MODE="production"

# <name>-<worker>-production.<subdomain>.workers.dev must fit one 63-character DNS label.
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
