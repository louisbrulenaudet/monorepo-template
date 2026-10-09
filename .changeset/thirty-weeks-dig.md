---
"worker-api": minor
"front-app": minor
---

Redact query strings from Workers logs and traces, and enable Workers Issues on `worker-api`

**Operator:** deployed Workers no longer record query strings in Workers Logs or traces, so filter by path or `requestId` instead. After the next deploy, check that the `worker-api-production` Issues page shows Issues as enabled.
