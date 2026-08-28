#!/usr/bin/env bash
# Purpose: Pin the repo-accurate merge contract onto the "chore: release" PR - the
# changesets/action description promises an npm publish that never happens here.
# Target: called by release.yml (Correct the release PR contract step) with
# GH_TOKEN and PR_NUMBER in the environment.
#
# --edit-last --create-if-none keeps this to one comment across the many times the
# version job re-runs while the release PR is open.
set -euo pipefail
: "${PR_NUMBER:?PR_NUMBER is required}"

gh pr comment "$PR_NUMBER" --edit-last --create-if-none --body-file - <<'BODY'
### What merging this PR does

**No npm publish happens.** Every workspace in this repo is `private: true`; there is
no `publishConfig` and no registry configured. Disregard the "published to npm
automatically" line in the description above.

Merging this PR:

1. lands the version bumps and `CHANGELOG.md` entries on `main`;
2. makes the `Release` workflow validate that commit with full-graph CI;
3. cuts the tag `v<version>` at it - the single release coordinate for both apps;
4. hands that tag to `CD`, which uploads and promotes both Workers to 100%.

Do not push edits to `changeset-release/main`: this branch is reset from the `main`
tip and force-pushed on every push to `main`, so the commit would be discarded.
Corrections belong in a new changeset on `main`.
BODY
