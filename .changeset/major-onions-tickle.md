---
"worker-api": patch
---

Fix `POST /api/v1/echo` answering a non-object JSON body with "unexpected field in request body"

It now answers "request body must be a JSON object".
