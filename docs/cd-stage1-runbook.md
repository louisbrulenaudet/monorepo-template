# Stage 1 CD runbook

Operator guide for **upload ≠ promote** on `worker-api` / `front-app`. Bound by [cd-operating-model.md](./cd-operating-model.md) and [cd-stage1-2-design.md](./cd-stage1-2-design.md). Evidence schemas: [cd-stage1-2-implementation-evidence.md](./cd-stage1-2-implementation-evidence.md) §12 / §15.

**Actual Worker names:** `worker-api-production`, `front-app-production`.

## Credential boundary

| Path | Who | What |
|------|-----|------|
| CI `upload` job on `main` | GitHub Actions + `CLOUDFLARE_API_TOKEN` | `wrangler versions upload` only |
| Promote / 0% smoke deploy / rollback | Human (owner or on-call) | Dashboard Promote, or local `pnpm --filter=<app> run promote` under **interactive human** Cloudflare auth |

Cloudflare documents `Workers Scripts Edit` as broad Workers write authority. There is **no upload-only permission**. The CI token is therefore **deployment-capable**. Workflow separation is not a security boundary: **do not** add a GitHub Actions promote workflow, and never call `versions deploy` / `wrangler deploy` from CI.

Secrets (never commit or log values):

- `CLOUDFLARE_API_TOKEN` — CI upload principal
- `CLOUDFLARE_ACCOUNT_ID` — account id
- Repository variable `VITE_API_BASE_URL` — production API origin baked into SPA uploads

Rotation / revocation owner: see [cd-owners.md](./cd-owners.md).

## Recurring main path

1. Verify CI green on `main`.
2. Upload job: Turbo affected **build** graph → production build → `versions upload` → release JSON artifact.
3. Version stays **outside** the active deployment (`decision: leave_inactive` until a human acts).

```sh
# Local equivalent (human auth)
export CD_AFFECTED_BASE=<sha>
export CD_AFFECTED_HEAD=<sha>
export VITE_API_BASE_URL=https://<worker-api-production-host>
pnpm run cd:upload
```

First publish / missing Worker: inventory + bootstrap `pnpm --filter=<app> run deploy` **before** production traffic. Not part of the recurring upload job. See [scripts/cd/inventory.md](../scripts/cd/inventory.md).

## Smoke checklist

Synthetic data only. No client/matter identifiers in URLs, logs, headers, or records.

### worker-api

1. Confirm version id from the release record.
2. Optional production-shaped path: human creates a **0%** two-version deployment (not upload; not Stage 2 progressive exposure).
3. Probe:

```sh
export SMOKE_BASE_URL=https://<worker-api-production-host>
export SMOKE_EXPECTED_VERSION_ID=<version-id>
# optional for 0% override smoke:
# export SMOKE_OVERRIDE_VERSION_ID=<version-id>
pnpm run cd:smoke:worker-api
```

Requires `X-Worker-Version-Id` to match. Fail closed if missing or mismatched.

### front-app

Assets-only: no runtime version header. Before override smoke, confirm the target version is listed in the active deployment (`wrangler deployments list --env production --json`). Then:

```sh
export SMOKE_BASE_URL=https://<front-app-production-host>
# export SMOKE_OVERRIDE_VERSION_ID=<version-id>
pnpm run cd:smoke:front-app
```

Proves index HTML + referenced critical JS/CSS load. Preview URLs stay disabled unless Access-protected.

## Contract checklist (shared wire)

Before any traffic move after a shared `@repo/dtos-common` / `@repo/enums-common` change:

1. Both consumer version ids recorded from the same commit (default upload widen).
2. Producer/consumer compatibility evidence recorded (types alone are insufficient).
3. Additive: promote **API to 100%** and verify old SPA, then promote SPA.
4. Removal: SPA off old shape first; keep API compatibility through open-client retirement.

## Human promote (Stage 1 = 100%)

1. Re-read active deployment; abort if it changed under you.
2. Smoke (above).
3. Fill release record fields: operator, smoke_method, served_version_verified, decision.
4. Promote via dashboard **or**:

```sh
pnpm --filter=worker-api run promote
# / pnpm --filter=front-app run promote
```

5. Verify active deployment reports the expected version; re-run probes.
6. Abort after preview only: leave version inactive. Abort after 0%: restore prior single-version 100%.

## Rollback drill hooks (human-only)

Record before/after deployment ids, probes, TTD/TTM against internal objectives (not Cloudflare SLAs):

1. Promote prior version to 100% (`wrangler rollback` / dashboard).
2. Confirm probes; note what rollback does **not** undo (routes, secrets contents, external state).
3. Dry-run blocked-rollback and partial-pair decisions from design §C.

Owners / rota: [cd-owners.md](./cd-owners.md).

## Stage 2 still blocked

- `front-app` is assets-only on `workers.dev` (no Transform Rule affinity).
- No version-attributed application-5xx / asset-404 gates.
- No end-to-end opaque request-id propagation from SPA → API.
