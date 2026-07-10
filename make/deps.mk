.PHONY: install install-frozen update

install: ## Initialize the project and install dependencies
	@echo "🔧 Initializing the project..."
	pnpm install

install-frozen: ## Initialize the project and install dependencies with frozen lockfile for CI/CD
	@echo "🔧 Initializing the project..."
	pnpm install --frozen-lockfile

update: ## Update all dependencies (including catalog entries in pnpm-workspace.yaml) to latest
	@echo "🔄 Updating dependencies..."
	pnpm update --recursive --latest
