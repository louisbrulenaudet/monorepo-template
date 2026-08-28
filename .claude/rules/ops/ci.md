---
paths:
  - ".github/workflows/**"
  - ".github/actions/**"
  - ".github/CODEOWNERS"
---

# Continuous Integration

The gate is [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml). Read it for the step list. It is **both** the PR check and a reusable workflow: `release.yml`'s `gate` job calls it so every push to `main` is validated before a tag is cut - see [`ops/release.md`](release.md). Deploy: [`ops/cd.md`](cd.md). Weakening a CI gate to force green is covered by [`guardrails.md`](../core/guardrails.md).

## Expression contexts - read this before touching `env:`

**Workflow-level `env:` may only reference `github`, `secrets`, `inputs`, `vars`.** Job-level `env:` adds `needs`, `strategy`, `matrix`. **`runner`, `job`, `steps`, and `env` are step-level only.** Referencing an unavailable context is a *validation* error: the file stops parsing, GitHub reports the run under the file path instead of the workflow name, and **zero jobs execute**. It does not degrade to an empty string.

This is not hypothetical. `d3e741b` added `NODE_COMPILE_CACHE: ${{ runner.temp }}/…` to workflow-level `env:` in `ci.yml` and `cd.yml`; both files were unparseable and **14 consecutive pushes ran no CI at all** before it was caught. Anything needing `$RUNNER_TEMP` goes through a step:

```yaml
- run: echo "NODE_COMPILE_CACHE=$RUNNER_TEMP/node-compile-cache" >> "$GITHUB_ENV"
```

## Repo invariants

- **Triggers:** `pull_request`, `workflow_call`, `workflow_dispatch`. **No `push:`** - pushes to `main` are covered by `release.yml`'s `gate`, so a commit is never checked twice.
- **Parity:** root `pnpm ci` and the workflow run the same *kinds* of checks. Change both when adding or renaming a gate. Scope differs by event on purpose: `--affected` on `pull_request` only, full graph on `workflow_call` / `workflow_dispatch` (a release must validate everything). Two `if:`-gated steps express this - never interpolate the flag into a `run:` body. The dependency audit is `pull_request`-only for the inverse reason: the advisory DB changes daily, so an auditing release gate is not a pure function of the commit; local `pnpm run ci` still audits.
- **`TURBO_SCM_BASE` is set on `pull_request` only,** to `origin/<base_ref>`; checkout only creates remote-tracking refs. It is deliberately empty elsewhere: the full-graph path needs no base, and `github.event.before` is all-zeros on a new branch, which silently degrades `--affected` to "everything changed". Keep `fetch-depth: 0` + `filter: blob:none`.
- **Parallelization:** one job, using the GitHub Actions `parallel:` step keyword (GA 2026-06-25, alongside `background` / `wait` / `wait-all` / `cancel`) for OXC (`lint`/`format`), `boundaries`, `types:check`, `knip`, and `syncpack`. A `parallel:` list item takes **no sibling keys** - `parallel:` is its only property. A **single** `turbo run check-types test build` invocation, not two turbo CLIs; turbo schedules against default concurrency (no override in `turbo.json`). Wrangler deploy dry-run is `front-app` only after the join (`worker-api` build is already a dry-run).
- **`changeset-release/**` is skipped** via a job-level `if` on `github.head_ref`. A `pull_request` `branches-ignore` filters the *base* branch and cannot do this. The release commit is validated by `gate` on the merge commit, so no branch-protection exemption is needed.
- **Step bodies longer than a few lines live as scripts, not inline YAML:** workflow-invoked ones under `.github/actions/<workflow>/` (`cd/`, `release/`), composite-action ones beside their `action.yml`. Invoke with `bash <path>` and wire inputs through step-level `env:`; each script opens with `set -euo pipefail` and fails fast on missing input (`:?` guards or an explicit check). Short steps stay inline.
- **Install:** `pnpm install --frozen-lockfile` after `pnpm/setup` with `install: false`. Node `runtime: node@24` matching root engines.
- **Remote cache:** job env wires `TURBO_TOKEN`, `TURBO_TEAM`, and `TURBO_REMOTE_CACHE_SIGNATURE_KEY` (repo secret, >= 32 bytes, same value as local machines - `turbo.json` enables `remoteCache.signature` + `longerSignatureKey`). `workflow_call` declares those two secrets **explicitly** so the release gate never receives Cloudflare credentials; never switch that call to `secrets: inherit`.
- **Pins:** every `uses:` is a full-length commit SHA with a `# vX.Y.Z` comment. `actions/checkout` sets `persist-credentials: false`. Workflow `permissions: {}` with per-job re-grants - `contents: read` only, since artifact upload and the setup caches use the runner's runtime token, not `GITHUB_TOKEN`. Runners: `ubuntu-24.04` (not `ubuntu-latest`).
- **`cancel-in-progress` only on pull_request.** Never interpolate `github.ref_name` into script bodies. No production/Cloudflare secrets in this workflow (CD only).
- Do not add scanners "for completeness" without a concrete threat and owner. Telemetry stays off at workflow `env:`.
