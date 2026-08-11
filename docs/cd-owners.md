# Stage 1 CD owners

Authority model is locked in [cd-operating-model.md](./cd-operating-model.md): deployable **owner or on-call delegate** promotes; one operator and one in-flight deployment change per Worker.

Named assignments below are required for Stage 0→1 exit. Prefill uses the only CODEOWNERS identity present today; replace with a rota when available.

| Surface | Owner / on-call | Notes |
|---------|-----------------|-------|
| `worker-api` (`worker-api-production`) | `@louisbrulenaudet` (TBD rota) | Promote / rollback / 0% smoke deploy |
| `front-app` (`front-app-production`) | `@louisbrulenaudet` (TBD rota) | Promote / rollback / asset smoke |
| `@repo/dtos-common` / `@repo/enums-common` | `@louisbrulenaudet` (TBD rota) | Expand/contract sign-off |
| CI Cloudflare upload token rotation | `@louisbrulenaudet` (TBD) | Token is deployment-capable; revoke on compromise |
| Access / preview posture | TBD | Keep `preview_urls` disabled unless Access-protected |

## Human-only blockers (not closable by code)

1. Confirm live remote inventory (`pnpm run cd:inventory`) against the production account.
2. Complete one rollback drill with measured TTD/TTM and blocked-rollback notes.
3. Name a durable on-call rota beyond CODEOWNERS.
4. Keep producer/consumer contract tests current for shared HTTP changes (Vitest under apps/*/tests/; extend when wire changes).
