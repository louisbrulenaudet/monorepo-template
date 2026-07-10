# make/app.mk - reusable per-package targets (include from apps/*/Makefile or packages/*/Makefile)
#
# Resolves the workspace package name from package.json (dir name != package name for @repo/*).

PKG ?= $(shell node -p "require('./package.json').name")
PROJECT_NAME := $(PKG)

.PHONY: build dev preview deploy check lint format check-types types ci

build: ## Build this package
	@echo "🔧 Building $(PKG)..."
	pnpm turbo run build --filter=$(PKG)

dev: ## Start the development server for this package
	@echo "💻 Starting development server for $(PKG)..."
	pnpm turbo run dev --filter=$(PKG)

preview: ## Preview the production build locally for this package
	@echo "👀 Previewing production build for $(PKG)..."
	pnpm turbo run preview --filter=$(PKG)

deploy: ## Deploy this package to Cloudflare Workers
	@echo "🚀 Deploying $(PKG)..."
	pnpm turbo run deploy --filter=$(PKG)

check: ## Check this package using OXC
	@echo "🔍 Checking $(PKG)..."
	pnpm turbo run lint format --filter=$(PKG)

lint: ## Lint this package using OXC (auto-fix)
	@echo "🔍 Running code analysis on $(PKG)..."
	pnpm turbo run lint:fix --filter=$(PKG)

format: ## Format this package using OXC (write)
	@echo "📝 Formatting $(PKG)..."
	pnpm turbo run format:fix --filter=$(PKG)

check-types: ## Check TypeScript types for this package
	@echo "🔍 Checking TypeScript types for $(PKG)..."
	pnpm turbo run check-types --filter=$(PKG)

types: ## Generate worker-configuration.d.ts for this package
	@echo "📄 Generating TypeScript type definitions for $(PKG)..."
	pnpm turbo run types --filter=$(PKG)

ci: ## Run lint, format, and typecheck for this package
	@echo "🔍 Running CI checks for $(PKG)..."
	pnpm turbo run lint format check-types --filter=$(PKG)
