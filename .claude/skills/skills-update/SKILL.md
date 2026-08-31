---
# Purpose: Claude Code skill for safe locked-skills updates.
# Target tool: Claude Code.
# Date reviewed: June 2026.
# Derived from: https://code.claude.com/docs/en/skills
name: skills-update
description: Update locked agent skills from skills-lock.json one at a time. Use when the user asks to update, refresh, or sync project skills via npx skills update.
when_to_use: Trigger for "update skills", "refresh skills", "sync skills-lock.json", "npx skills update", or "skills-update".
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git diff:*)
  - Bash(git status:*)
  - Bash(npx skills update:*)
  - Bash(bash .agents/skills/skills-update/scripts/update-locked-skills.sh:*)
  - Bash(bash .agents/skills/skills-update/scripts/readd-legacy-skills.sh:*)
  - Bash(npx skills add:*)
  - Bash(pnpm exec cspell:*)
---

# Skills Update

Safe per-skill refresh for externally installed skills. Invocation is **explicit only** — do not update skills unless the user requests it.

## Workflow

1. Follow the canonical workflow in [`.agents/skills/skills-update/SKILL.md`](../../../.agents/skills/skills-update/SKILL.md).
2. Prefer the helper script when updating all locked skills:

   ```bash
   bash .agents/skills/skills-update/scripts/update-locked-skills.sh
   ```

3. For a single skill, run one command:

   ```bash
   npx skills update <skill-name>
   ```

4. Report using the output format from the shared skill.

## Hard stops

- Never run bare `npx skills update` without skill names.
- Never run `npx skills add <source>` without `--skill <name>`.
- Never run `npx skills add` unless explicitly requested (new skill or legacy refresh).
- Do not update project-local skills not listed in `skills-lock.json`.
