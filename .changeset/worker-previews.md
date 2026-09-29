---
"front-app": minor
"worker-api": minor
---

Add Worker Previews support: a Preview configuration under each production Worker (the `ctx.isPreview` branch of `cloudflare.config.ts`) and `AppEnvironment.PREVIEW`, the only environment where `CORS_ORIGINS` may hold a single-label prefix wildcard.
