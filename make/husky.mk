.PHONY: prepare husky-status

prepare: ## Install or reinstall Husky git hooks
	@echo "🪝 Installing Husky git hooks..."
	pnpm run prepare

husky-status: ## Show Husky hooks status
	@echo "📋 Checking Husky hooks..."
	@if [ -d .husky ]; then \
		echo "✅ Husky directory found"; \
		echo "📁 Hooks available:"; \
		ls -1 .husky/ 2>/dev/null | grep -v "^_\|^\.\|husky.sh" | while read hook; do \
			if [ -f ".husky/$$hook" ] && [ -x ".husky/$$hook" ]; then \
				echo "  - $$hook"; \
			fi; \
		done || echo "  (no hooks found)"; \
	else \
		echo "❌ Husky directory not found. Run 'make prepare' first."; \
	fi
