# Review CI command

Run a **CI-focused** review: GitHub Actions workflow, caching, lockfile and reproducibility, branch/trigger strategy, Dependabot, Husky pre-commit, and deploy pipeline. Your reply must be a **plan of suggested changes**: concise, actionable, and structured—not only prose.

## Cursor command usage

This file is a [Cursor custom command](https://docs.cursor.com/context/commands): plain Markdown in `.cursor/commands/`. When the user runs `/review-ci` in chat, this content is sent as the prompt.

- **Parameters:** Any text after `/review-ci` is scope—e.g. `/review-ci workflow only`, `/review-ci caching`—narrow accordingly. If none given, assume full CI review (workflow, lockfile, hooks, deploy, Dependabot).

This command is project-scoped and works with @ mentions and Rules. For a full review use `/review` instead.

## Best practices alignment

- **Workflow** — Checkout with sufficient fetch depth when needed; Node and pnpm versions pinned and aligned with package.json engines/packageManager; steps run in a sensible order (install → lint → typecheck → build).
- **Caching** — pnpm store and optionally Turborepo remote cache to speed runs; cache keys include lockfile hash where appropriate.
- **Reproducibility** — CI install uses `--frozen-lockfile` (or equivalent) so builds fail on lockfile drift; same Node/pnpm versions as local dev.
- **Permissions** — Minimal permissions (e.g. contents: read for CI that only needs to read repo); no write unless deploy or release.
- **Secrets** — No secrets in logs; use GitHub secrets for any tokens; mask in outputs if needed.
- **Hooks** — Pre-commit runs formatter/lint on staged files; fast and deterministic (e.g. Biome format only or check).
- **Deploy** — Deploy step separate from main CI or behind approval; optional smoke/health check after deploy.

Align with root [AGENTS.md](AGENTS.md) for Makefile targets and tooling.

## Deep technical review

Conduct a CI-only review. Inspect the following and call out violations or improvements.

### GitHub Actions workflow

- **Artifacts:** [.github/workflows/ci.yml](.github/workflows/ci.yml).
- **Checks:** Checkout: use `actions/checkout@v4` or newer; set `fetch-depth: 0` only if needed (e.g. for git history in versioning). pnpm: use `pnpm/action-setup@v2` or newer with version from packageManager or explicit. Node: use `actions/setup-node@v4` or newer; `node-version` matches engines (e.g. 22); `cache: 'pnpm'` for store cache. Steps: install (frozen lockfile), then lint/format (`make check`), then typecheck (`make check-types`), then build (`make build`). Job name and step names clear. Permissions: `contents: read` sufficient for non-deploy CI; add `permissions` block explicitly. No secrets echoed in run steps; use env for tokens if needed. Concurrency: optional cancel-in-progress for same branch to save minutes.

### Caching

- **Artifacts:** [.github/workflows/ci.yml](.github/workflows/ci.yml), [turbo.json](turbo.json), [package.json](package.json).
- **Checks:** pnpm cache: enabled via `cache: 'pnpm'` in setup-node or pnpm/action-setup. Turborepo: if remote cache used, token and config correct; otherwise local cache only. Cache key: include lockfile or pnpm-lock.yaml hash so cache invalidates on dependency change. No overly broad keys that cause unnecessary cache misses.

### Lockfile and reproducibility

- **Artifacts:** [.github/workflows/ci.yml](.github/workflows/ci.yml), [Makefile](Makefile) (install-frozen target), [package.json](package.json) (engines, packageManager), pnpm-lock.yaml.
- **Checks:** Install command uses frozen lockfile (e.g. `pnpm install --frozen-lockfile` or `make install-frozen`). Lockfile committed. packageManager in package.json matches pnpm version used in CI. engines.node matches Node version in workflow. No `pnpm install` without frozen in CI (would allow drift).

### Branch and trigger strategy

- **Artifacts:** [.github/workflows/ci.yml](.github/workflows/ci.yml).
- **Checks:** Trigger: push to all branches (or to main/beta and PRs) as documented. Pull requests: if CI runs on PR, it uses same workflow. No redundant triggers that double runs unless intended. Optional: only run on certain paths (paths-filter) if repo is large and some changes don’t need full build.

### Dependabot and dependency updates

- **Artifacts:** [.github/dependabot.yml](.github/dependabot.yml) (if present), root and app package.json.
- **Checks:** Dependabot configured for npm (or pnpm); schedule and open-pull-requests-limit set. Grouping: optional groups (e.g. minor-patch) to reduce PR noise. Versioning strategy: allow or ignore as needed. CI runs on Dependabot PRs so updates are validated.

### Husky and pre-commit

- **Artifacts:** [.husky/pre-commit](.husky/pre-commit), [make/husky.mk](make/husky.mk) or root Makefile (prepare target), [biome.json](biome.json).
- **Checks:** Pre-commit hook runs formatter (e.g. Biome) on staged files only; command is fast (no full lint if format is enough for pre-commit). Use git-format-staged or lint-staged so only staged files are processed. Hook is executable and invoked by Husky. `make prepare` (or equivalent) installs hooks; documented in AGENTS.md or README. No heavy steps (e.g. full build) in pre-commit.

### Deploy pipeline

- **Artifacts:** [.github/workflows/](.github/workflows/) (any deploy workflow), [Makefile](Makefile) (deploy target), [turbo.json](turbo.json) (deploy task).
- **Checks:** Deploy is separate job or workflow (e.g. on push to main or manual); not mixed with lint in a way that blocks on deploy secrets. Deploy uses same build artifact or rebuilds with same lockfile. Optional: health check or smoke test after deploy (e.g. curl health endpoint). No deploy on every branch unless intended (e.g. preview deploys). Permissions for deploy: only what’s needed (e.g. Cloudflare API token in secrets).

### Observability and debugging

- **Artifacts:** [.github/workflows/ci.yml](.github/workflows/ci.yml).
- **Checks:** Failures: step names and job names make it clear where it failed. Optional: upload build or test artifacts on failure for debugging. Logs: no secrets printed; verbose logging only where needed. Optional: status badge in README.

### Anti-patterns to flag

- CI install without frozen lockfile (allows drift).
- Node or pnpm version in workflow not matching package.json engines/packageManager.
- Permissions broader than needed (e.g. contents: write when not deploying).
- Pre-commit running full build or slow lint on every commit.
- Deploy on every push to every branch without protection.
- No cache for pnpm or Turborepo when it would speed up runs.
- Dependabot disabled or not validating PRs with CI.

## Steps

1. **Gather scope** — Full CI or specific area (workflow, cache, hooks, deploy, Dependabot). Default to full.
2. **Read conventions** — AGENTS.md for Makefile targets (install-frozen, check, check-types, build, deploy) and tooling.
3. **Inspect workflow** — ci.yml: checkout, setup-node, pnpm, install, check, check-types, build; permissions and triggers.
4. **Inspect caching** — pnpm and Turborepo cache usage; cache keys.
5. **Inspect lockfile and install** — install-frozen; packageManager and engines; lockfile committed.
6. **Inspect Dependabot and Husky** — dependabot.yml; .husky/pre-commit and prepare target.
7. **Inspect deploy** — Deploy workflow or job; permissions; optional health check.
8. **Compose plan** — Critical / Improvements / Optional; each item: **what**, **where**, **why**. One-line "no issues" per sub-area if none.

## Checklist

- [ ] Scope clear
- [ ] AGENTS.md consulted for Makefile and tooling
- [ ] GitHub Actions workflow (steps, versions, permissions) reviewed
- [ ] Caching (pnpm, Turborepo) reviewed
- [ ] Lockfile and frozen install reviewed
- [ ] Branch/trigger strategy reviewed
- [ ] Dependabot and pre-commit (Husky/Biome) reviewed
- [ ] Deploy pipeline and optional smoke test reviewed
- [ ] Plan structured as Critical / Improvements / Optional with what/where/why

## Context usage

- Use `@file` for ci.yml, dependabot.yml, .husky/pre-commit, Makefile, turbo.json, package.json.
- Use `@code` for specific workflow steps or cache keys when suggesting changes.
- Use `@docs` or `@web` for GitHub Actions and pnpm/Turborepo caching best practices.

If context is insufficient, suggest which files or @ references to add.

## Review checklist

- **Correctness:** Workflow runs the right commands in the right order; frozen install is used.
- **Conventions:** Matches AGENTS.md (make install-frozen, make check, make check-types, make build).
- **Quality:** Reproducible, fast where possible (cache), minimal permissions.
- **Actionability:** Every suggestion is implementable (e.g. "add cache key", "set fetch-depth").
- **Trade-offs:** Note any (e.g. cache size vs hit rate).
- **Scope:** CI only; defer config or security to their reviews.

## Output format

Respond with a **plan** only (no implementation unless the user asks):

1. **Critical** – Must-fix (no frozen lockfile, wrong Node/pnpm version, permissions too broad, pre-commit broken).
2. **Improvements** – Worthwhile (caching, explicit permissions, Dependabot grouping, deploy health check).
3. **Optional** – Nice-to-haves (concurrency, path filters, status badge). Prefix with **Nit:** for non-blocking polish.

For each item: **what** to change, **where** (file/area), and **why**. If a sub-area has no findings, state it in one line.
