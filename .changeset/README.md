# Changesets

A changeset is a small Markdown file in this folder: the **release note for one user-visible change**, plus which apps it bumps and by how much. The `Release` workflow turns the pending ones into versions and `apps/<app>/CHANGELOG.md` entries, and CD copies those entries into the GitHub Release. Write it for the people who operate or call the apps; the why and the how belong in the commit and PR description. Upstream docs: [changesets.dev](https://changesets.dev).

Nothing here is published to npm. Every workspace is `"private": true`. **A release is a Cloudflare Workers deploy**, and its coordinate is one git tag `vX.Y.Z` shared by every app.

## Commands

| Command                                          | Does                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `pnpm changeset`                                 | Create a changeset interactively: pick the apps, the bump, the summary                      |
| `pnpm changeset --patch worker-api -m '<title>'` | The same without prompts (`--minor`, comma-separated apps)                                  |
| `pnpm changeset --empty -m '<reason>'`           | Record that a change ships nothing observable                                               |
| `pnpm release:check`                             | The PR gate, run locally; `git add` a new changeset first, since it only sees tracked files |
| `pnpm release:status`                            | Read-only: every pending changeset and the next versions                                    |

## Do I need one?

| Your change                                                                                                                | Changeset                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Anything a user or operator of a deployed app can observe, including through a shared `@repo/*` package                    | `patch` or `minor`                                                                                              |
| A catalog bump of a runtime `dependencies` entry of an app (`pnpm-workspace.yaml`)                                         | `patch` naming that app; Dependabot PRs get one committed for them when the `CHANGESET_BOT_TOKEN` secret is set |
| An app or package file changed but nothing observable did: types, comments, a behavior-identical refactor, devDependencies | `pnpm changeset --empty -m '<reason>'`                                                                          |
| Only tests, docs, `.github/`, agent config, or root tooling                                                                | none                                                                                                            |
| A fix to a change that is still pending on `main`                                                                          | edit that pending changeset                                                                                     |

`pnpm release:check` answers the question mechanically: `changedFilePatterns` in [`config.json`](config.json) excludes tests, top-level Markdown, `turbo.json`, Vitest config, and `@repo/vitest-config`. It runs in `pnpm run ci` and fails a PR that needs a changeset and has none. The **🦋 Changeset** comment on every PR shows the same verdict, the release notes the PR carries, and the fix.

## Writing one

- **Name apps only** - `worker-api`, `front-app`, any other unscoped workspace under `apps/` - each app whose behavior changes. Never an `@repo/*` package: its entry would land in a changelog no release note reads. Every app bumps together (one `fixed` group), so the names decide only which changelog carries the entry.
- **One changeset per logical change.** A fix and a feature in one PR are two files. When you rework your own PR, edit the changeset you already added.
- **First line**: one imperative sentence of at most 100 characters, naming the surface in backticks and what changes for the reader. It becomes the changelog bullet.
- **Body** (optional): at most three short paragraphs - operator action, changed defaults, migration steps. No headings (the body renders inside a list item); use **bold** lead-ins.
- **Leave out**: file lists, internal function names, the story of the PR, and anything identifying a user, a tenant, or a customer. Changelogs are public.
- **Keep the generated file name** (for example `brave-owls-sing.md`), never a descriptive one: two open PRs choosing the same name conflict, while the random id never reaches a changelog. To rename a pending file, `git mv` it in a commit of its own, or its changelog entry loses the link to the commit that added it.

### Bump levels

| Bump    | For                                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patch` | Fixes, performance, hardening, runtime dependency and bundler bumps, `compatibilityDate` moves, copy                                                                    |
| `minor` | New capability old clients survive (route, response field, UI feature), or anything an operator must act on or know (new secret, binding, or variable; changed default) |
| `major` | A broken public contract: a removed or renamed route or field, stricter validation, a changed error envelope                                                            |

While the apps are `0.x`, a breaking change is `minor` and its first line starts with `**Breaking:**`. `major` means cutting 1.0.0: CI refuses it unless the PR carries the `release:major` label (locally: `CHANGESET_ALLOW_MAJOR=1`). Judge "breaking" against production, not against earlier commits of your own PR. `worker-api` is promoted before `front-app` and open tabs keep the old SPA, so a wire break ships in steps: add the new shape, move clients over, then remove the old one - the last step carries the breaking changeset.

### Examples

```md
---
"worker-api": patch
---

Fix `POST /api/v1/echo` answering a non-object JSON body with "unexpected field in request body".
```

```md
---
"worker-api": minor
"front-app": minor
---

Add Sentry error tracking to the gateway and the SPA, with distributed tracing between them.

**Operator action:** set the `SENTRY_DSN` secret on `worker-api-production` before the next deploy, or the upload fails.
```

```md
---
"worker-api": minor
---

**Breaking:** Rename `requestId` to `request_id` in every error body.

Clients reading `body.requestId` from a 4xx or 5xx response must read `body.request_id`.
```

```md
---
---

No release: tighten the `fetchJsonWithSchema` types; the built output is unchanged.
```

Backticks inside a double-quoted `-m` are shell command substitution. Quote the message with a heredoc:

```sh
pnpm changeset --patch worker-api -m "$(cat <<'EOF'
Fix `POST /api/v1/echo` answering a non-object JSON body with the wrong message
EOF
)"
```

## Releasing

While any changeset sits on `main`, the `Release` workflow keeps a `chore: release` PR open on `changeset-release/main`. **Merging it is the release act**: the merge commit is validated, tagged `vX.Y.Z`, and deployed.

- **Never push to `changeset-release/main`.** Every push to `main` resets it and force-pushes one fresh commit, so manual edits are lost. To correct an entry, edit its pending changeset in a PR to `main`.
- **Its required check comes from a `CI` run that `Release` dispatches on the branch.** GitHub holds the `pull_request` runs of a bot-opened PR for approval; leave them unapproved and wait for the dispatched check. If it is missing: `gh workflow run ci.yml --ref changeset-release/main`.
- **Merge it only after the latest `Release` run on `main` has finished.** Otherwise a PR merged just before shows up in this release's code but in the next release's notes. "Require branches to be up to date before merging" makes GitHub enforce this.
- **Release small and often**: merge it at least daily while it holds a real changeset, and right after any fix that must ship.
- **Hotfix**: a normal PR with a `patch` changeset, then merge the release PR. If `main` holds work that must not ship yet, revert that work first; its changeset leaves with it.
- **Undo after a release**: a revert PR with its own `patch` changeset (`Revert …`), or the rollback in `.claude/rules/ops/release.md` for an emergency.
- **No prereleases**: CD refuses pre-mode tags. Test a branch with a Worker Preview.

Local preview of the version bump, without touching the tree: `pnpm release:status`. `changeset version` is CI's job.

## Troubleshooting

| Symptom                                                          | Fix                                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `release:check` says no changesets were found, but you added one | `git add` it: the check diffs tracked files against `origin/main`                                                                                                                                                        |
| `origin/main is missing`                                         | `git fetch origin main`                                                                                                                                                                                                  |
| `changesets(app-only)`                                           | Replace the `@repo/*` name with the app(s) whose behavior changes                                                                                                                                                        |
| `changesets(runtime-dependency)`                                 | A catalog bump of an app's runtime dependency: add a `patch` changeset for that app, or `--empty`                                                                                                                        |
| A Dependabot PR fails `release:check`                            | The `CHANGESET_BOT_TOKEN` Dependabot secret is expired or lacks access: renew it, or add the changeset to the branch by hand. Without the secret, Dependabot PRs pass with a warning and their bumps ship without a note |
| The release PR only deletes empty changesets                     | It releases nothing; merge it to clear the queue                                                                                                                                                                         |

Pipeline internals, invariants, and recovery: [`.claude/rules/ops/release.md`](../.claude/rules/ops/release.md).
