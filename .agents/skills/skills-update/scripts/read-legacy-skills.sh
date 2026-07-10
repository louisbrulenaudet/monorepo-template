#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
LOCKFILE="${ROOT}/skills-lock.json"

cd "${ROOT}"

if [[ ! -f "${LOCKFILE}" ]]; then
  echo "error: skills-lock.json not found at ${LOCKFILE}" >&2
  exit 1
fi

mapfile -t LEGACY_SKILLS < <(
  node -e "
    const lock = require('${LOCKFILE}');
    for (const [name, entry] of Object.entries(lock.skills ?? {})) {
      if (!entry.skillPath) {
        console.log([name, entry.source, entry.sourceType ?? ''].join('\t'));
      }
    }
  "
)

if [[ "${#LEGACY_SKILLS[@]}" -eq 0 ]]; then
  echo "No legacy skills without skillPath in skills-lock.json."
  exit 0
fi

echo "Re-adding ${#LEGACY_SKILLS[@]} legacy skill(s) from source..."

for row in "${LEGACY_SKILLS[@]}"; do
  IFS=$'\t' read -r name source source_type <<<"${row}"

  if [[ "${source_type}" == "well-known" ]]; then
    echo ""
    echo "==> skip ${name} (well-known source '${source}' is not re-addable via git clone)"
    continue
  fi

  echo ""
  echo "==> npx skills add ${source} --skill ${name} -y"
  if ! npx skills add "${source}" --skill "${name}" -y; then
    echo "error: failed to re-add skill '${name}' from '${source}'" >&2
    exit 1
  fi
done

echo ""
echo "Legacy skill re-add complete."
