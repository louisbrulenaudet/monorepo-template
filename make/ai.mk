.PHONY: ai-config-check

ai-config-check: ## Validate Cursor/Claude parity and hook behavior
	@echo "Validating AI agent configuration..."
	@hooks/tests/validate-ai-config.sh
	@hooks/tests/test-hooks.sh
