---
"worker-api": minor
"front-app": minor
---

Add Sentry error tracking: `@sentry/hono` on the gateway (`SENTRY_DSN` secret) and `@sentry/react` on the SPA (`VITE_SENTRY_DSN`), with distributed tracing between them, matching Sentry environments (`VITE_APP_ENVIRONMENT`), and privileged-data collection and console breadcrumbs disabled. Source maps upload to Sentry from CD; the SPA loads router tracing after first render and reports unexpected TanStack Query errors.
