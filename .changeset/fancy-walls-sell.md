---
"worker-api": minor
---

Add a validated `POST /api/v1/echo` endpoint, which answers 404 in production

It validates a JSON body and an optional `?uppercase=true` flag, and answers a validation failure with `{ error, requestId, issues }`. It is off in production because it reflects caller input on an unauthenticated route with no rate limit.
