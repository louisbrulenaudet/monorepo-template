.PHONY: install update check types format lint ci

install: ## Initialize the project and install dependencies
	@echo "🔧 Initializing the project..."
	pnpm install

update: ## Update dependencies to their latest versions
	@echo "🔄 Updating dependencies..."
	pnpm update

check: ## Check the codebase using Biome
	@echo "🔍 Checking codebase..."
	pnpm run check

types: ## Generate worker-configuration.d.ts files recursively
	@echo "📄 Generating TypeScript type definitions..."
	pnpm run types

format: ## Format the codebase using Biome
	@echo "📝 Formatting code..."
	pnpm run format

lint: ## Lint the codebase using Biome
	@echo "🔍 Running code analysis..."
	pnpm run lint

ci: ## Run full checks before committing for CI/CD pipeline (lint, format, check)
	@echo "🔍 Running CI checks..."
	pnpm run check && pnpm run lint && pnpm run format
