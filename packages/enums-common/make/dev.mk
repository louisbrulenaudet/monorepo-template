.PHONY: check check-types types format lint

check: ## Check the codebase using Biome
	@echo "🔍 Checking codebase..."
	pnpm run check

check-types: ## Check TypeScript types
	@echo "🔍 Checking TypeScript types..."
	pnpm run check-types

types: ## Generate worker-configuration.d.ts files recursively
	@echo "📄 Generating TypeScript type definitions..."
	pnpm run types

format: ## Format the codebase using Biome
	@echo "📝 Formatting code..."
	pnpm run format

lint: ## Lint the codebase using Biome
	@echo "🔍 Running code analysis..."
	pnpm run lint
