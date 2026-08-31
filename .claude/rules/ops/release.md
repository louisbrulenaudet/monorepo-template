---
paths:
  - ".changeset/**"
  - ".github/workflows/release.yml"
  - ".github/actions/create-release-tag/**"
---

# Releases

[Changesets](https://changesets.dev) computes versions; the pipeline is [`.github/workflows/release.yml`](../../../.github/workflows/release.yml). Read it for the job list; long step bodies live as `bash`-invoked scripts under `.github/actions/` (convention: [`ops/ci.md`](ci.md)). Human-facing "how do I" lives in [`.changeset/README.md`](../../../.changeset/README.md); CI internals in [`ops/ci.md`](ci.md); the deploy in [`ops/cd.md`](cd.md).

Nothing is published to npm. Every workspace is `private: true`, no `publishConfig`, no `.npmrc`. **A release is a git tag plus a Cloudflare Workers promote.**

## State machine

```text
push to main ──► Release  (concurrency release-main, queue: max, never cancelled)
  ├─ gate         ALWAYS. uses ci.yml (full graph, not --affected)
  ├─ select-mode  'version' | 'none'   ('publish' is unreachable here)
  ├─ mode == 'version' → version → open/update the "chore: release" PR   [END]
  └─ mode != 'version' → tag (needs gate) → created? → deploy → uses cd.yml
```

## Invariants

- **`gate` runs on every push to main, in both modes.** While a release PR is open the mode is always `version`, so a gate placed only on the release path would leave `main` unvalidated for that PR's whole life. Do not move it under the `mode != 'version'` branch.
- **The tag is the idempotency key.** `create-release-tag` skips when `vX.Y.Z` exists and reports `created=false`; `deploy` is gated on `created == 'true'`, so re-running `Release` never re-deploys. The existence probe is three-way: 2xx skips, 404 creates, and any other probe failure fails the job rather than guessing. To redeploy on purpose use `cd.yml`'s `workflow_dispatch` with the tag.
- **`mode != 'version'`, not `mode == 'publish'`.** `select-mode` returns `publish` only when publishable packages exist, and all of ours are private, so `publish` is unreachable and the equality test would never fire. This condition is load-bearing.
- **`privatePackages.tag: false` is deliberate.** `changeset git-tag` (the v3 name of `changeset tag`) would emit one `<app>@X.Y.Z` per app; the deploy keys on one shared `vX.Y.Z`, which is why the tag is cut by `create-release-tag` instead.
- **`fixed: [["*"]]` *is* the app set, and it rests on apps being unscoped.** Changesets expands every `fixed` entry with picomatch against package **names**, and `*` does not cross `/` - so the group is exactly the unscoped workspaces (the apps) and never an `@repo/*` package. A new app joins the shared version by existing. Nothing machine-checks the convention underneath - `.syncpackrc.json`'s `@repo/**` group governs dependency *specifiers*, not workspace names, and `pnpm boundaries` never looks at a name - so it is kept by hand: never give an app a scoped name, and never add an unscoped package under `packages/`. An unscoped package there would silently join the release group and start bumping to the app version.
- **`baseBranch: "main"` and `privatePackages.version: true` are load-bearing.** The documented defaults are `"master"` and `{version: false, tag: false}` - the latter would version nothing at all here.
- **The version PR branch is force-pushed, not accumulated.** Every push to `main` resets `changeset-release/main` from the tip, re-runs `changeset version`, and force-pushes one commit. It can never be behind `main` or conflict with it, and manual edits to it are destroyed. Verified on PR #19: base tracked the newest `main` SHA with a single commit.
- **Tags created with `GITHUB_TOKEN` do not trigger workflows.** This is why `cd.yml` has no `push: tags:` trigger and `release.yml` calls it directly. Do not "restore" a tag trigger; it is dead code (GitHub `GITHUB_TOKEN` docs; changesets/action#669).
- **`queue: max`, not the default.** With `queue: single`, a third push replaces the pending run and that release is silently dropped.
- **CI is skipped on `changeset-release/**` head branches** via a job-level `if` - a `pull_request` `branches-ignore` filters the *base* branch and cannot express this. The release commit is validated by `gate` on the merge commit instead, so no branch-protection exemption is needed.

## Recovery

| Fails | Recovery |
|-------|----------|
| `gate` red | Fix on a PR. No tag, no deploy. |
| `version` push rejected | Re-run; the branch is reset from `main` each time. |
| `tag` version drift | Re-align every app in one commit; the action fails closed, naming each app and its version. |
| Tag already exists | `created=false`, deploy skipped. Not an error. |
| `deploy` upload/promote/smoke | Tag stands. "Re-run failed jobs" on the Release run retries the deploy (the `tag` job's `created=true` output is preserved; "re-run all jobs" instead re-probes, gets `created=false`, and skips - safe, not a retry), or run `cd.yml` via `workflow_dispatch` with the tag. Rollback: `pnpm --filter=<app> exec wrangler rollback --env production`. |

## Repo settings this depends on

- *Actions → General → Allow GitHub Actions to create and approve pull requests* enabled.
- `production` GitHub Environment holding `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` and the `VITE_API_BASE_URL` variable. CD stays paused until they exist: the `deploy` job also requires the repository variable `CD_ENABLED == 'true'`, gated at the caller because a job skipped inside a `workflow_call` target reports success.
- Before real traffic: `apps/worker-api/wrangler.jsonc` `env.production.vars.CORS_ORIGINS` ships empty, so `/api/*` fails closed with 503 and the CD smoke fails *after* both promotes. Setting it takes a new release - vars ship inside the uploaded version, so a CD re-run cannot fix it.
