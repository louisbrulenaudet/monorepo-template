#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
LOCKFILE="${ROOT}/skills-lock.json"

cd "${ROOT}"

if [[ ! -f "${LOCKFILE}" ]]; then
  echo "error: skills-lock.json not found at ${LOCKFILE}" >&2
  exit 1
fi

# No `mapfile`: macOS ships bash 3.2, where it does not exist. Command substitution
# also propagates a node failure under `set -e`, which process substitution would swallow.
SKILL_NAMES_RAW="$(
  node -e "
    const lock = require('${LOCKFILE}');
    for (const name of Object.keys(lock.skills ?? {})) {
      console.log(name);
    }
  "
)"

SKILL_NAMES=()
while IFS= read -r name; do
  [[ -n "${name}" ]] || continue
  SKILL_NAMES+=("${name}")
done <<<"${SKILL_NAMES_RAW}"

if [[ "${#SKILL_NAMES[@]}" -eq 0 ]]; then
  echo "error: no skills found in skills-lock.json" >&2
  exit 1
fi

echo "Updating ${#SKILL_NAMES[@]} locked skill(s) from skills-lock.json..."

for name in "${SKILL_NAMES[@]}"; do
  echo ""
  echo "==> npx skills update ${name}"
  if ! npx skills update "${name}"; then
    echo "error: failed to update skill '${name}'" >&2
    exit 1
  fi
done

echo ""
echo "All ${#SKILL_NAMES[@]} locked skill(s) updated successfully."
