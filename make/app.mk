# make/app.mk - reusable per-package targets (include from apps/*/Makefile or packages/*/Makefile)
#
# Resolves the workspace package name from package.json (dir name != package name for @repo/*).

PKG ?= $(shell node -p "require('./package.json').name")
PROJECT_NAME := $(PKG)

# OXC always runs from the repo root, scoped to this package by path - never
# `oxlint .` from inside the package. See the note in make/quality.mk for why
# (CWD-relative `better-tailwindcss.entryPoint`, one tsgolint spawn, identical
# diagnostics between `make ci` and `make lint-agent`).
REPO_ROOT := $(shell git rev-parse --show-toplevel)
PKG_PATH := $(shell git rev-parse --show-prefix)

.PHONY: build dev preview deploy check lint lint-agent format check-types types types-check ci

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

check: ## Check this package using OXC (read-only)
	@echo "🔍 Checking $(PKG)..."
	cd $(REPO_ROOT) && pnpm exec oxlint --no-error-on-unmatched-pattern $(PKG_PATH)
	cd $(REPO_ROOT) && pnpm exec oxfmt --check $(PKG_PATH)

lint: ## Lint this package using OXC (auto-fix)
	@echo "🔍 Running code analysis on $(PKG)..."
	cd $(REPO_ROOT) && pnpm exec oxlint --no-error-on-unmatched-pattern --fix $(PKG_PATH)

lint-agent: ## Lint this package with AI-agent output (no auto-fix)
	@echo "🤖 Linting $(PKG) (agent format)..."
	cd $(REPO_ROOT) && pnpm exec oxlint --no-error-on-unmatched-pattern --format=agent $(PKG_PATH)

format: ## Format this package using OXC (write)
	@echo "📝 Formatting $(PKG)..."
	cd $(REPO_ROOT) && pnpm exec oxfmt $(PKG_PATH)

check-types: ## Check TypeScript types for this package
	@echo "🔍 Checking TypeScript types for $(PKG)..."
	pnpm turbo run check-types --filter=$(PKG)

types: ## Regenerate worker-configuration.d.ts for this package (commit the result)
	@echo "📄 Regenerating Worker types for $(PKG)..."
	pnpm turbo run types --filter=$(PKG)

types-check: ## Verify this package's committed worker-configuration.d.ts is current
	@echo "📄 Checking Worker types for $(PKG)..."
	pnpm turbo run types:check --filter=$(PKG)

ci: ## Run lint, format, and typecheck for this package
	@echo "🔍 Running CI checks for $(PKG)..."
	@$(MAKE) check
	pnpm turbo run check-types --filter=$(PKG)
