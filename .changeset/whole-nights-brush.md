---
---

Root tooling now discovers deployable apps from `apps/*` instead of naming them: the changeset `fixed` group is the glob `[["*"]]`, root `preview`/`promote`/`upload` use `--filter='./apps/*'`, and CD uploads, promotes, and writes release notes by looping `.github/actions/lib/apps.mjs` in each app's `monorepo.deployOrder`; uploads now run concurrently since they change no traffic, while promotes stay ordered. Each app also declares a `monorepo.healthPath` - the public probe path, or `null` for no public HTTP surface - so `smoke-versions.sh` reads the gateway's probe from the manifest instead of hardcoding it, and names any other promoted app it cannot reach. Tooling only - nothing shipped changes.
