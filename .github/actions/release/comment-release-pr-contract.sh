#!/usr/bin/env bash
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
3. cuts the tag `v<version>` at it - the single release coordinate for every app;
4. hands that tag to `CD`, which uploads and promotes every Worker to 100%.

The required check on this PR comes from the `CI` run that `Release` dispatches on
`changeset-release/main`. GitHub holds the `pull_request` runs of a bot-opened PR
for approval; leave them unapproved.

Do not push edits to `changeset-release/main`: this branch is reset from the `main`
tip and force-pushed on every push to `main`, so the commit would be discarded.
To correct an entry, edit its pending changeset in a PR to `main`.
BODY
