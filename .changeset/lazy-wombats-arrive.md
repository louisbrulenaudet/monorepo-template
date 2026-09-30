---
"front-app": minor
"worker-api": minor
---

Add Sentry error tracking to `worker-api` and `front-app`, with distributed tracing between them

**Operator action:** set the `SENTRY_DSN` secret on `worker-api-production` once before the first deploy, or the upload fails. The SPA reads `VITE_SENTRY_DSN` and `VITE_APP_ENVIRONMENT` at build time.

Sensitive-data collection and console breadcrumbs are off. With `SENTRY_ORG` set, CD uploads source maps; the SPA loads router tracing after first render and reports unexpected TanStack Query errors.
