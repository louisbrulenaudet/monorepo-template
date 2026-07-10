.PHONY: skills-update

SKILLS_UPDATE_SCRIPT := .agents/skills/skills-update/scripts/update-locked-skills.sh

skills-update: ## Update each locked agent skill from skills-lock.json (one command per skill)
	@echo "🔄 Updating locked agent skills..."
	bash $(SKILLS_UPDATE_SCRIPT)
