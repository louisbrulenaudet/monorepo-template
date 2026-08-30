---
---

Root tooling now discovers deployable apps from `apps/*` instead of naming them: the changeset `fixed` group is the glob `[["*"]]`, root `preview`/`promote`/`upload` use `--filter='./apps/*'`, and CD uploads, promotes, and writes release notes by looping `.github/actions/lib/apps.mjs` in each app's `monorepo.deployOrder`. Tooling only - nothing shipped changes.
