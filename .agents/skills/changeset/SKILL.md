---
name: changeset
description: "USE WHEN: a change under apps/ or packages/ (or an app runtime dependency bump) needs its release note, the user asks to add, fix, or check a changeset, a PR is about to open, or `pnpm release:check` fails. DO NOT USE WHEN: editing the release pipeline itself (.changeset/config.json, release.yml, the check scripts) - rule ops/release."
---

# Changeset

Writing, bump, and frontmatter rules live in rule `ops/changesets` (`.claude/rules/ops/changesets.md`; Cursor: `.cursor/rules/ops/changesets.mdc`). Read it first if it is not already loaded; this skill is only the procedure.

1. **Scope.** Read the branch diff (`git diff origin/main...HEAD --stat`, plus uncommitted work) and split it into the changes a user or operator of a deployed app would notice. Note which apps each one reaches, including through a bundled `@repo/*` package or a runtime catalog bump.
2. **Reuse.** `git diff --name-only --diff-filter=AM origin/main -- .changeset/` lists this branch's changesets. If one already covers a change, edit it instead of adding another. If the change fixes something still pending on `main`, edit that pending changeset.
3. **Decide per change**, with the rule's tables:
   - nothing observable ships: `--empty`, or no changeset at all if `pnpm release:check` passes without one;
   - otherwise `patch` or `minor`, naming every app whose behavior changes and never an `@repo/*` package;
   - never `major` unless the user asked for a breaking release. While the apps are `0.x`, a breaking change is `minor` with a `**Breaking:**` title.
4. **Create** one file per change, keeping the generated name:

   ```sh
   pnpm changeset --patch worker-api,front-app -m "$(cat <<'EOF'
   Imperative title of at most 100 characters naming the surface in `backticks`

   Optional body: operator action, changed defaults, migration.
   EOF
   )"
   ```

   Use `--minor` in the same form, or `pnpm changeset --empty -m '<one-line reason>'`.
5. **Verify.** `git add .changeset/<id>.md`, then `pnpm release:check`. Fix every `changesets(<rule>)` line it prints and rerun until it exits 0. `pnpm release:status` shows the resulting versions.
6. **Report** the file, the apps, and the bump in your reply and the PR description, and say why an `--empty` ships nothing.
