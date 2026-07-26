.PHONY: check lint lint-agent format check-types types-check boundaries ci

# Lint and format are NOT run through Turborepo, and must not be.
#
# oxlint resolves `settings.better-tailwindcss.entryPoint` in .oxlintrc.json
# against the process CWD. A per-package `oxlint .` therefore looks for
# apps/front-app/apps/front-app/src/index.css, which degrades the four
# context-aware Tailwind rules to a warning banner on every message. Running
# once from the repo root also spawns tsgolint once instead of once per package,
# and guarantees `make ci` and `make lint-agent` report identical diagnostics.
#
# The full-repo pass is ~2.0s with type-aware rules (~0.05s without), so there
# is nothing worth caching. SCOPE / FILTER / AFFECTED apply to the turbo-backed
# targets only (check-types, build, deploy); lint and format are always
# whole-repo. To narrow them, pass a path: `pnpm exec oxlint apps/front-app`.

check: ## Check the codebase using OXC (read-only)
	@echo "🔍 Checking codebase..."
	@pnpm run check

lint: ## Lint the codebase using OXC (auto-fix)
	@echo "🔍 Running code analysis..."
	@pnpm run lint:fix

lint-agent: ## Lint with AI-agent output (machine-readable file:line:col, no auto-fix)
	@echo "🤖 Linting (agent format)..."
	@pnpm run lint:agent

format: ## Format the codebase using OXC (write)
	@echo "📝 Formatting code..."
	@pnpm run format:fix

check-types: ## Check TypeScript types
	@echo "🔍 Checking TypeScript types..."
	$(TURBO) check-types $(TURBO_FILTER)

boundaries: ## Check package dependency boundaries against turbo.json tag rules
	@echo "🧱 Checking package boundaries..."
	pnpm turbo boundaries

types-check: ## Verify committed worker-configuration.d.ts matches wrangler.jsonc
	@echo "📄 Checking generated Worker types are up to date..."
	$(TURBO) types:check

ci: ## Run full checks before committing for CI/CD pipeline
	@echo "🔍 Running CI checks..."
	@pnpm run lint:check
	@pnpm run format:check
	$(TURBO) check-types $(TURBO_FILTER)
# worker-configuration.d.ts is committed, so lint/typecheck above just read it.
# This verifies it has not drifted from wrangler.jsonc - the failure mode the
# commit-the-types approach trades for the old "missing on a fresh clone" one.
	@$(MAKE) types-check
	@$(MAKE) boundaries
