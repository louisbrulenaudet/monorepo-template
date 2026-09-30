---
"worker-api": patch
---

Add `requestId` to the 405 body, and send `Server-Timing` and pretty JSON in `dev` only

`Server-Timing` headers and pretty-printed JSON were also sent in `staging` and Previews. Every error body, the 405 included, is now `{ error, requestId }`.
