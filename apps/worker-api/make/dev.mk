.PHONY: install update check build build-check deploy dev preview check-types types format lint ci

install: ## Initialize the project and install dependencies
	@echo "🔧 Initializing the project..."
	pnpm install

update: ## Update dependencies to their latest versions
	@echo "🔄 Updating dependencies..."
	pnpm update

check: ## Check the codebase using Biome
	@echo "🔍 Checking codebase..."
	pnpm run check

build: ## Build the project
	@echo "🔧 Building the project..."
	pnpm run build

build-check: ## Build with type check (for CI/release)
	@echo "🔧 Building with type check..."
	pnpm run build:check

deploy: ## Deploy the project to Cloudflare Workers
	@echo "🚀 Deploying to Cloudflare Workers..."
	pnpm run deploy

dev: ## Start the development server
	@echo "💻 Starting development server..."
	pnpm run dev

preview: ## Preview the production build locally
	@echo "👀 Previewing production build..."
	pnpm run preview

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

ci: ## Run full checks before committing for CI/CD pipeline (lint, format, check)
	@echo "🔍 Running CI checks..."
	pnpm run check && pnpm run lint && pnpm run format
