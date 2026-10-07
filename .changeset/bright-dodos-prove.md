---
"front-app": minor
"worker-api": minor
---

Report the release version on `/api/v1/health` and on the `front-app` home page

Both apps now share one version, and each production deploy starts from a CI-validated `vX.Y.Z` tag.
