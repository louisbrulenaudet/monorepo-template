---
name: skills-update
description: Update locked agent skills from skills-lock.json one at a time. Use when the user asks to update, refresh, or sync project skills via pnpm exec skills update.
when_to_use: Trigger for "update skills", "refresh skills", "sync skills-lock.json", "pnpm exec skills update", or "skills-update".
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git diff:*)
  - Bash(git status:*)
  - Bash(pnpm exec skills update:*)
  - Bash(bash .agents/skills/skills-update/scripts/update-locked-skills.sh:*)
  - Bash(bash .agents/skills/skills-update/scripts/read-legacy-skills.sh:*)
  - Bash(pnpm exec cspell:*)
---

# Skills Update

Safe per-skill refresh for externally installed skills. Invocation is **explicit only** - do not update skills unless the user requests it.

## Workflow

1. Follow the canonical workflow in [`.agents/skills/skills-update/SKILL.md`](../../../.agents/skills/skills-update/SKILL.md).
2. Prefer the helper script when updating all locked skills:

   ```bash
   bash .agents/skills/skills-update/scripts/update-locked-skills.sh
   ```

3. For a single skill, run one command:

   ```bash
   pnpm exec skills update <skill-name>
   ```

4. Report using the output format from the shared skill.

## Hard stops

- Never run bare `pnpm exec skills update` without skill names.
- Never run `pnpm exec skills add <source>` without `--skill <name>`, and only when the user explicitly asks (new skill or legacy refresh); it needs a prompt, since it is not pre-approved.
- Do not update project-local skills not listed in `skills-lock.json`.
