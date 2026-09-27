---
"worker-api": patch
"front-app": patch
---

Stack-review fixes. `POST /api/v1/echo` now answers a non-object JSON body with "request body must be a JSON object" instead of "unexpected field in request body". `front-app` renders a styled not-found page for unknown URLs, and its footer and copy-prompt button use semantic color tokens so they stay legible in dark mode. Both Workers move to compatibility date 2026-09-23 (no flag changes default in between).
