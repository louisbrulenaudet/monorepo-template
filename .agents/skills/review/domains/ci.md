---
id: ci
summary: GitHub Actions gate, CD, release and Preview workflows, workflow hardening, caches and artifacts trust, Vite+ hooks, Dependabot
model: sonnet
---

# CI

Does every workflow check what it claims, run least-privilege, resist untrusted input, and hand the deploy only artifacts it can trust? `review-stack` has no GitHub Actions companion, so this domain owns the workflows end to end.

## Ground truth

- Rules: [ops/ci](../../../../.claude/rules/ops/ci.md) (read Expression contexts and Invariants first), [ops/cd](../../../../.claude/rules/ops/cd.md), [ops/release](../../../../.claude/rules/ops/release.md), [ops/previews](../../../../.claude/rules/ops/previews.md), [core/turborepo](../../../../.claude/rules/core/turborepo.md).
- [hooks/AGENTS.md](../../../../hooks/AGENTS.md); skill `cf` for `--prebuilt`, `--mode`, and `--dry-run`.
- GitHub [Security hardening for GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use) for anything the rules do not already state.
- For supply-chain depth: [security-audit/SUPPLY-CHAIN-AND-RELEASE.md](../../security-audit/SUPPLY-CHAIN-AND-RELEASE.md) (Core discipline, Validation) - read, never edit.

## Scope

Every file under [.github/workflows/](../../../../.github/workflows/) and [.github/actions/](../../../../.github/actions/), [.github/dependabot.yml](../../../../.github/dependabot.yml), `.github/CODEOWNERS`, `.github/labeler.yml` when present, [.vite-hooks/pre-commit](../../../../.vite-hooks/pre-commit), root [vite.config.ts](../../../../vite.config.ts) (`staged`), root `package.json` scripts (`ci`, `prepare`, `release:*`), `.changeset/config.json`. A focus names one workflow or `hooks`.

## Probe

`pnpm hooks:test`, `pnpm release:check` (read-only changeset gate; exit 1 lists what is missing) and `pnpm release:status`, `pnpm turbo query affected --packages`, `git log --follow --format='%h %s' -- <workflow>`.

## Axes

- **Gate parity**: `ci.yml` runs the same kinds of checks as local `pnpm run ci` (rule `ops/ci` Parity); triggers are `pull_request`, `workflow_call`, `workflow_dispatch` - no `push:`; `--affected` on PRs only, the full graph on `workflow_call` / `workflow_dispatch`, expressed as `if:`-gated steps; the "Generate cf types" step precedes `parallel:`; a gate that can pass while checking nothing (skipped step, `continue-on-error`, empty filter) is Critical.
- **Expression and script safety**: every `env:` references only contexts valid at its level; no `${{ github.event.* }}`, `github.head_ref`, or `github.ref_name` interpolated into a `run:` body - pass through step `env:` and quote; long bodies live in `.github/actions/<concern>/` scripts opened with `set -euo pipefail` and `:?` guards.
- **Privilege**: workflow `permissions: {}` with per-job re-grants; `persist-credentials: false` on every checkout; no `pull_request_target`, or `workflow_run` that checks out or executes PR code while secrets or a write token are present; never `secrets: inherit`; `workflow_call` declares its secrets explicitly; Cloudflare credentials only in CD, at step-level `env:`.
- **Pinning and runners**: every `uses:` is a full commit SHA with a `# vX.Y.Z` comment, and a same-repo one is `$/<path>`; the `Workflow security` step (zizmor) stays in the gate; `ubuntu-24.04`, never `-latest`; Dependabot covers the `github-actions` and npm ecosystems, grouped, and its PRs run the same gate.
- **Cache and artifact trust**: `TURBO_CACHE` is `remote:rw` only on `pull_request` and write-only elsewhere, so a PR cannot plant an entry the release gate replays; the remote-cache signature key is wired; CD has no Turbo token; nothing a PR job writes (cache, artifact) is restored by a deploy or release job; the pnpm store cache is `actions/cache` keyed on the lockfile in `ci.yml` only, never `pnpm/setup`'s `cache: true`.
- **Release and CD**: `release.yml` `gate` validates the merge commit before a tag is cut; no `v*` tag is pushed by hand; the release PR's required check comes from the `version` job's `gh workflow run ci.yml --ref changeset-release/main`, and the release-PR skip is bound to both `head_ref` and the bot author; upload (`cf workers versions create`) and promote (`cf workers deployments create`) are separate steps addressing the same immutable version id; every `--prebuilt` step passes the mode the Build Output records; apps promote in `monorepo.deployOrder`; the post-promote smoke probes each `monorepo.healthPath`; CD and Previews stay gated on `CD_ENABLED` / `PREVIEWS_ENABLED`.
- **Install and reproducibility**: `pnpm/setup` with `install: false`, then `pnpm install --frozen-lockfile`; Node from `runtime: node@24` matching root `engines`; the pnpm version comes from `devEngines.packageManager`; telemetry off at workflow `env:` wherever turbo, cf, or Wrangler run.
- **Hooks**: `.vite-hooks/pre-commit` runs `vp staged` only (no full lint or build); `pnpm prepare` installs it; the bypass (`VP_GIT_HOOKS=0`) is documented; `pnpm hooks:test` covers every script in `hooks/`.
- **Observability**: step and job names say what failed; failure artifacts come from `apps/*/.cloudflare/output/**`; `cancel-in-progress` only on `pull_request`; no secret echoed.

## Critical when

A gate that stays green while skipping its check; untrusted event data interpolated into a shell; PR code executed with secrets or a write token; an unpinned third-party action; a deploy that restores PR-writable cache or artifacts; upload and promote addressing different versions; a hand-pushed release tag path.

## Overlaps

Turbo task definitions and `--affected` semantics belong to `review-stack turborepo`; `cf` command flags and Build Output to `review-stack cf`; dependency vulnerabilities in the lockfile to `security`; `cloudflare.config.ts` modes to `configuration`. This domain owns lockfile, engines, frozen install, Dependabot, and every workflow file.

## Accepted

- The serial local `ci` chain vs parallel CI steps, audit on `pull_request` only, one job with `parallel:`: rule [ops/ci](../../../../.claude/rules/ops/ci.md).
- No scanner added "for completeness" without a concrete threat and owner: rule [ops/ci](../../../../.claude/rules/ops/ci.md).
- Environment protection rules and branch protection are GitHub settings: Needs validation, never a finding.
