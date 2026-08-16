---
paths:
  - ".github/workflows/**"
  - ".github/CODEOWNERS"
---

# Continuous Integration

The gate is [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml). Read it for the step list. Deploy after green `main`: [`ops/cd.md`](cd.md). Weakening a CI gate to force green is covered by [`guardrails.md`](../core/guardrails.md).

## Repo invariants

- **Parity:** root `pnpm ci` and the workflow run the same *kinds* of checks. Change both when adding/renaming a gate. Intentional difference: CI uses `turbo … --affected` for typecheck/test/build; local `pnpm ci` is the full graph. Keep checkout **`fetch-depth: 0`** + **`filter: blob:none`**, and set **`TURBO_SCM_BASE`** to `origin/<base_ref>` on PRs (checkout only creates remote-tracking refs), so `--affected` works.
- **Install:** `pnpm install --frozen-lockfile` after `pnpm/setup` with `install: false`. Node `runtime: node@24` matching root engines.
- **Pins:** every `uses:` is a full-length commit SHA with `# vX.Y.Z` comment. `actions/checkout` sets `persist-credentials: false`. Workflow `permissions: {}` with per-job `contents: read`. Runners: `ubuntu-24.04` (not `ubuntu-latest`).
- **`cancel-in-progress` only on pull_request.** Never interpolate `github.ref_name` into script bodies. No production/Cloudflare secrets in workflow files (CD only).
- Do not add scanners "for completeness" without a concrete threat and owner. Telemetry stays off at workflow `env:`.
