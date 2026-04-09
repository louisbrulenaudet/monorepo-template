.PHONY: install install-frozen update check login deploy build dev preview check-types types format lint ci

install: ## Initialize the project and install dependencies
	@echo "🔧 Initializing the project..."
	pnpm install --recursive

install-frozen: ## Initialize the project and install dependencies with frozen lockfile for CI/CD
	@echo "🔧 Initializing the project..."
	pnpm install --recursive --frozen-lockfile

update: ## Update dependencies to their latest versions
	@echo "🔄 Updating dependencies..."
	pnpm update --recursive

check: ## Check the codebase using Biome
	@echo "🔍 Checking codebase..."
	pnpm turbo run check

login: ## Login to Cloudflare
	@echo "🔑 Logging in to Cloudflare..."
	pnpm wrangler login
	@echo "✅ Cloudflare logged in"

deploy: ## Deploy the project to Cloudflare Workers
	@echo "🚀 Deploying to Cloudflare Workers..."
	pnpm turbo run deploy

build: ## Build all packages and apps (Turborepo)
	@echo "🔧 Building..."
	pnpm turbo run build

dev: ## Start the development server
	@echo "💻 Starting development server..."
	pnpm turbo run dev

preview: ## Preview the production build locally
	@echo "👀 Previewing production build..."
	pnpm turbo run preview

check-types: ## Check TypeScript types
	@echo "🔍 Checking TypeScript types..."
	pnpm turbo run check-types

types: ## Generate worker-configuration.d.ts files recursively
	@echo "📄 Generating TypeScript type definitions..."
	pnpm turbo run types

format: ## Format the codebase using Biome
	@echo "📝 Formatting code..."
	pnpm turbo run format

lint: ## Lint the codebase using Biome
	@echo "🔍 Running code analysis..."
	pnpm turbo run lint

ci: ## Run full checks before committing for CI/CD pipeline
	@echo "🔍 Running CI checks..."
	pnpm turbo run check
	pnpm turbo run check-types
