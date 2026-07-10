---
name: skills-update
description: >
  USE WHEN: updating locked agent skills from skills-lock.json, refreshing
  upstream skill content, or running npx skills update for project skills.
  DO NOT USE WHEN: adding new skills (use npx skills add with explicit approval),
  running bare npx skills update without skill names, or updating project-local
  skills that are not listed in skills-lock.json.
disable-model-invocation: true 
---

# Skills Update

Refresh externally installed skills listed in [`skills-lock.json`](../../../skills-lock.json).
Installed copies live under [`.agents/skills/`](../../).

Invocation is **explicit only** — do not update skills unless the user requests it.

## Hard rules

- **Never** run `npx skills update` without at least one skill name. A bare update
  installs or refreshes every discoverable skill and pollutes `.agents/skills/`
  with unwanted content.
- **Never** run `npx skills add <source>` without `--skill <name>`. A bare add
  installs every skill from the source repo and pollutes `.agents/skills/`.
- **Never** run `npx skills add` unless the user explicitly requests a new skill
  or a legacy refresh (see below).
- **Only** update skill names present as keys in `skills-lock.json`.
- **One skill name per `npx` invocation.** Do not batch multiple skills in a
  single command unless the user explicitly names them.
- Run all commands from the **repository root**.
- Network access is required.

## Workflow

1. Read `skills-lock.json` and collect `Object.keys(skills)` — this is the
   authoritative list. Do not rely on a stale embedded list.
2. For each name, run a **separate** command:

   ```bash
   npx skills update <skill-name>
   ```

3. If a skill reports **“cannot be updated automatically (installed before
   skillPath tracking)”**, re-add it from its lockfile `source` with `--skill`:

   ```bash
   npx skills add <source> --skill <skill-name> -y
   ```

   Example:

   ```bash
   npx skills add github/awesome-copilot --skill git-commit -y
   ```

Or run the helper script (skips `well-known` sources such as
   `stripe-best-practices`):

   ```bash
   bash .agents/skills/skills-update/scripts/read-legacy-skills.sh
   ```

4. Stop and report on the **first failure**; do not continue blindly.
5. Review `git status` and `git diff`:
   - Expect changes under `.agents/skills/<locked-skill>/` and `skills-lock.json`
     (`computedHash` updates).
   - Flag any **new** skill directories not in the lockfile.
   - Confirm project-local skills (e.g. `monorepo-setup`, `zod`,
     `dependency-audit`, `lint-autofix`) are unchanged.
6. Run cspell on touched paths:

   ```bash
   pnpm exec cspell skills-lock.json ".agents/skills/**/SKILL.md"
   ```

## Helper script

From the repository root:

```bash
make skills-update
```

Equivalent to:

```bash
bash .agents/skills/skills-update/scripts/update-locked-skills.sh
```

The script reads `skills-lock.json`, runs `npx skills update <name>` once per
skill sequentially, and exits non-zero on the first failure.

### Legacy re-add script

For skills missing `skillPath` in the lockfile:

```bash
bash .agents/skills/skills-update/scripts/read-legacy-skills.sh
```

After re-add, future refreshes work via `npx skills update <name>` because the
lockfile gains a `skillPath`.

## Known limitations

- `stripe-best-practices` (`sourceType: well-known`, `docs.stripe.com`) cannot
  be re-added with `npx skills add` — the CLI tries to git-clone the source and
  fails. Leave as-is or refresh manually when the skills CLI supports it.

## Output format

```text
Skills Updated
- <skill-name>: <passed/failed>

Skills Skipped
- <skill-name>: <reason, or "None">

Unexpected Paths
- <path or "None">

Commands
- <command>: <result>

Validation
- <command>: <passed/failed>
```
