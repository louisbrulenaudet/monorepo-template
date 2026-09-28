---
---

Simplicity pass (`/review-simplicity`): `front-app` drops the unused in-flight dedupe and the unused `method`/`headers`/`body` options from `fetchJsonWithSchema` (TanStack Query already dedupes by key), reuses `resolveCorrelationId` from `@repo/correlation-id`, inlines single-caller helpers (`StatusDot`, `api-health-dot`, `copy-text`, the router error wrapper), and trims `Button` variants and `CopyPromptButton` props that no caller sets. `worker-api` shares one `AppEnv` type and shrinks the CSRF `Sec-Fetch-Site` check. `@repo/dtos-common` loses its empty root barrel, and `@repo/dtos-common` and `@repo/enums-common` lose their empty Vitest scaffolding, so `passWithNoTests` goes back to Vitest's default `false`. The `quality/` post-edit hooks merge into `check-changed.sh`, without the stale `sed` fallback.

No release: no route, response, header, or rendered output changes.
