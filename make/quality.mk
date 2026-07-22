.PHONY: check lint lint-agent format check-types ci

check: ## Check the codebase using OXC
	@echo "🔍 Checking codebase..."
	$(TURBO) lint format $(TURBO_FILTER)

lint: ## Lint the codebase using OXC (auto-fix)
	@echo "🔍 Running code analysis..."
	$(TURBO) lint:fix $(TURBO_FILTER)

lint-agent: ## Lint with AI-agent output (machine-readable file:line:col, no auto-fix)
	@echo "🤖 Linting (agent format)..."
	@pnpm run lint:agent

format: ## Format the codebase using OXC (write)
	@echo "📝 Formatting code..."
	$(TURBO) format:fix $(TURBO_FILTER)

check-types: ## Check TypeScript types
	@echo "🔍 Checking TypeScript types..."
	$(TURBO) check-types $(TURBO_FILTER)

ci: ## Run full checks before committing for CI/CD pipeline
	@echo "🔍 Running CI checks..."
	$(TURBO) lint format check-types $(TURBO_FILTER)
