.PHONY: login deploy

login: ## Login to Cloudflare
	@echo "🔑 Logging in to Cloudflare..."
	pnpm wrangler login
	@echo "✅ Cloudflare logged in"

deploy: ## Deploy the project to Cloudflare Workers
	@echo "🚀 Deploying to Cloudflare Workers..."
	$(TURBO) deploy $(TURBO_FILTER)
