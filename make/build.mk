.PHONY: build dev preview types

build: ## Build all packages and apps (Turborepo)
	@echo "🔧 Building..."
	$(TURBO) build $(TURBO_FILTER)

dev: ## Start the development server
	@echo "💻 Starting development server..."
	$(TURBO) dev $(TURBO_FILTER)

preview: ## Preview the production build locally
	@echo "👀 Previewing production build..."
	$(TURBO) preview $(TURBO_FILTER)

types: ## Generate worker-configuration.d.ts files recursively
	@echo "📄 Generating TypeScript type definitions..."
	$(TURBO) types --filter='./apps/*' $(TURBO_FILTER)
