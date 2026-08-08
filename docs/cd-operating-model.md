# Continuous Deployment Operating Model

> Organizational decision memo for this monorepo. Architecture and platform rationale live in [continuous-deployment-workers.md](./continuous-deployment-workers.md); this document states what we do for the next maturity stages so those basics are not re-litigated.

**Audience:** Engineers promoting Workers traffic, owning contracts, or designing Stage 1–2 CD workflows.

**Baseline (today):** CI is verify-only; deploy is manual `turbo run deploy` → `wrangler deploy --env production`; deployables are `worker-api` (Hono gateway) and `front-app` (Vite SPA on Workers assets); shared `@repo/dtos-common` + `@repo/enums-common`; staging env blocks exist but are not the default path; no KV/R2/DO/Queues in use yet.

**Hard distinction:** Cloudflare **Worker version / gradual deployment / version affinity / rollback** control which **binary** serves traffic. **Flagship** controls which **behavior** runs inside already-deployed code. Do not conflate them.

---

## 1. Verdict

### Near-term model (Stages 1–2)

**(a) Merge → version upload + manual promote.**

- On merge to `main`, eligible affected deployables get an immutable Worker **version uploaded**; traffic is **not** moved automatically.
- A human promotes (including Stage 2 percentage ramps). Upload ≠ deploy remains the standing control plane.
- Stage 2 still uses this model: gradual ramps, SPA version affinity, and version-diff watching are practiced under **manual** promote authority—not automated progressive safeguards yet.

### Deferred target (Stage 3+)

**(c) Gated full CD** — routine compute/UI may auto-ramp with metric gates; migrations, binding topology, and contract removals stay human-gated. Do not adopt (b) or (c) until Stage 1→2 exit criteria below are met.

### Explicitly rejected for now

| Rejected | Why |
|----------|-----|
| Scheduled release trains | Batches maximize SPA↔API skew and rollback pain for little gain on a thin Workers surface. |
| Blanket merge → 100% auto-deploy | CI green is permission to expose, not production proof; SPA asset skew and missing affinity/alerts make this unsafe. |
| Workers Builds as primary monorepo orchestrator | Keep GitHub Actions + Turborepo `--affected` as the deploy-graph brain. Cloudflare supports external CI/CD; Builds watch-paths may assist later but must not replace affected-graph honesty. |
| Regional rollouts as a primary CD lever | Not a first-class Workers model; prefer percentage + affinity. |
| Designing full multi-Worker Queue/DO CD playbooks as default path | Those products are not in use; do not invent that operating surface yet. |

---

## 2. Deploy graph honesty

### Deployable units today

| Unit | Role | New Worker version required when |
|------|------|----------------------------------|
| `worker-api` | Public HTTP gateway | App source, its Wrangler config/bindings shape, or any workspace package it bundles changes in a way Turbo would mark the app `--affected` for `build` / `deploy`. |
| `front-app` | Vite SPA served as Workers static assets | Same rule; a Vite build must precede upload. |

No other `worker-*` / `queue-*` / `webhook-*` / `mcp-*` apps exist yet. When they appear, each is its own deployable; this memo’s package vs runtime-edge rules still apply.

### Mapping Turbo `--affected` → “new version required”

Treat Turbo’s affected graph for `build`/`deploy` as the **default deploy set**. If an app would rebuild, it needs a new uploaded version before its change can serve production traffic. If it would not rebuild, do not upload a decorative new version.

### Shared packages (`@repo/dtos-common`, `@repo/enums-common`)

- Workspace packages are JIT-bundled into each consumer artifact. A contract change that either app imports requires **coordinated consumer versions**—default: **both** `worker-api` and `front-app` get new versions in the same promote window when the changed surface is shared wire format.
- Single-app deploy after a shared-package change is allowed only when the change cannot affect the other consumer’s wire use (rare). When unsure, deploy both.
- Additive contract PRs must update producers and consumers in the **same PR** (already a Contribution rule). That PR still yields multiple uploadable versions—one per affected deployable.

### Package edges vs service-binding edges

| Edge type | What freezes | Skew risk |
|-----------|--------------|-----------|
| Package (`workspace:*`) | Build-time: each Worker/SPA freezes its dependency closure into its version | Cross-deployable only when different apps are on different versions |
| Service binding (future) | Runtime: caller and callee ramp independently | **Expected** during gradual deploys; contracts must tolerate N/N+1; version overrides are for coordinated smoke/pin, not a substitute for expand/contract |

### Default policy: affected-only

**Always deploy only affected deployables.** Reject always-deploy-all: it widens blast radius, trains false confidence (“we redeployed everything so it must be fine”), and fights the Turbo model CI already uses.

---

## 3. Change classification (gate policy)

| Class | Auto-eligible (Stage 3+)? | Stages 1–2 promote | Forbidden on `main` without expand/contract window? |
|-------|---------------------------|--------------------|-----------------------------------------------------|
| Routine compute / UI | Yes, once auto-ramp gates exist | Manual promote; gradual preferred for production when risk > trivial | No |
| Additive contract | No until all consumers have uploaded versions that understand the addition | Manual; coordinated multi-app versions | No — but same-PR consumer updates required |
| Breaking / removal contract | Never | Manual only after expand window complete and consumers migrated | **Yes** — expand → migrate consumers → contract |
| Binding topology / routes / secrets shape | Never | Manual; treat as infra change, not routine promote | N/A — separate change control; do not sneak into routine PRs |
| Storage / migration (future DO/KV/Queue/DB) | Never | Manual; disables “routine” promote path | N/A until products exist; when they do, migration PRs are explicitly labeled |
| Emergency hotfix | Manual fast-path only | May skip gradual if delay risk exceeds cutover risk; document the skip | Contract rules still apply — hotfixes do not license silent breaks |

**Classifier rule:** If a change touches wire schemas, Wrangler bindings/routes/secrets shape, or durable storage layout, it is **not** routine—even if types still pass.

---

## 4. Progressive delivery levers

### Workers gradual deployment (binary blast radius)

- **When used:** Stage 2 production promotes for non-trivial changes. Prefer a short percentage ladder over immediate 100% when either app’s behavior or assets change.
- **`front-app` affinity:** Mandatory whenever traffic is split and assets use content-hashed filenames. Set a stable `Cloudflare-Workers-Version-Key` (e.g. Transform Rule on the zone) so HTML and hashed JS/CSS stay on the same version. Without affinity, gradual SPA deploys tend to produce asset **404s**.
- **SPA ↔ API skew:** Affinity pins **within** `front-app`. It does **not** lock `front-app` and `worker-api` to the same binary generation. HTTP contracts must tolerate N and N+1 during independent ramps. Prefer promoting additive API support before SPA clients that depend on it; reverse order for removals.

Regional percentage-by-geography is **not** our primary lever.

### Flagship (behavior blast radius)

| Topic | Decision |
|-------|----------|
| Evaluation authority | Prefer **`worker-api` Flagship binding** (edge-local, no outbound HTTP, no app-managed token). |
| How `front-app` learns | API / bootstrap payload from `worker-api`. Do **not** ship Cloudflare API tokens in the browser OpenFeature client provider (docs: not recommended for public apps). |
| App / flag ownership | One Flagship app per deployable ownership boundary (`worker-api`, `front-app`). Flags have an owner, safe default, and cleanup criterion. |
| Kill-switch vs Worker rollback | See precedence table below. |

**Precedence (mitigation order):**

| Situation | Prefer |
|-----------|--------|
| New feature / path causing errors; new version otherwise healthy | **Flagship kill-switch / disable** |
| Regressed correct old behavior; no schema/storage change | **Worker version rollback** (promote prior version to 100%) |
| Bad or irreversible storage / message schema migration | **Forward fix** (or product PITR/restore)—not blind Worker rollback |
| Partial multi-app incompatible ramp | Pause promotes; align versions; flag off risky paths |

Rollback of a Worker version does **not** revert KV/R2/DO/D1/Queue data or unbound account-level routing. Bindings attached to the rolled-back version come back with that version; **data** does not rewind.

### Flagship public-beta risk acceptance

We accept Flagship (public beta) as the intended **deploy ≠ release** layer for this stack, with these safe-default rules:

- Every evaluation supplies a **safe `defaultValue`** (typed getters). Evaluation failure, missing flag, or type mismatch → **safe-off / prior-safe variant**, never fail-open into risky behavior.
- Expect brief global mixed views after flag changes (docs: on the order of tens of seconds). Design UX and API for that window.
- Flagship disable is not schema safety for future queues/DO/DB.

Until Flagship is wired, incomplete features stay off by code path or simply do not merge; do not invent a second flag SaaS for the SPA.

---

## 5. Observability go/no-go bar

### Minimum signals before ANY auto-ramp

These are also the Stage 2 practice bar for **manual** gradual promotes:

1. **Version-diff** error / exception rate and latency (at least p95) comparable across the two versions in a split.
2. **`front-app` asset 404 rate** during splits (classic affinity/skew symptom).
3. **Opaque request IDs** correlating `front-app` → `worker-api` (and later RPC), with **no** client/matter identifiers in log lines, trace attributes, error bodies, cache keys, or URL paths.

CI green is necessary and insufficient. No promote to auto-ramp without the signals above.

### Detection and mitigation targets

| Metric | Target | Justification |
|--------|--------|---------------|
| Time-to-detect | **≤ 5 minutes** after a ramp step | Edge activation is fast; version-diff metrics exist in platform UX; “next morning” is too late for percentage ramps. |
| Time-to-mitigate | **≤ 15 minutes** | Human-approved Flagship kill or Worker rollback under the precedence table; matches a manual-promote on-call model. |

### Not required yet (deferred)

- Full OpenTelemetry export / third-party APM as a gate
- Automated pause/rollback robots
- Queue depth, DLQ, or DO-specific SLIs (products not in use)
- Perfect business SLI dashboards beyond health/ready and the signals above

---

## 6. Compatibility policy

Enforceable standing rules for HTTP DTOs in `@repo/dtos-common` (and later RPC/queue schemas in the same package):

1. **Expand/contract only.** Add optional fields and additive enum members first. Consumers adopt. Removals and renames happen only after the expand window.
2. **N and N+1 must coexist** as a standing constraint across `front-app` ↔ `worker-api` (and future service-binding pairs) whenever either side can gradual-deploy independently.
3. **Same-PR discipline** for additive wire changes that require consumer updates; never leave `main` with a producer that emits a shape no live consumer understands—or a consumer that requires a field no live producer emits—without an explicit compatibility window.
4. **What disables promote / future auto-ramp:**
   - Known breaking or removal contract on `main` without a completed expand/migrate window
   - Incomplete consumer uploads for an additive contract that those consumers must understand before traffic moves
   - Missing version-diff or `front-app` asset-404 visibility for a gradual promote path
   - Binding topology, secrets shape, or storage/migration labeled changes treated as “routine”

Privileged legal-domain data rules still apply while debugging skew: no matter/client identifiers in telemetry.

---

## 7. Maturity exit criteria

### Stage 0 → 1

- [ ] CI remains the merge gate (boundaries, lint, format, affected typecheck/build).
- [ ] Version **upload without immediate 100% traffic** practiced until boring on a non-critical path.
- [ ] **Rollback drill** completed (time-to-mitigate measured; “what rollback does not undo” understood).
- [ ] Named owners for `worker-api`, `front-app`, and shared contracts.
- [ ] Staging or preview habit is real (envs already exist in Wrangler; they are used before production promote).

### Stage 1 → 2

- [ ] Production promotes can use **gradual percentage** splits for both deployables.
- [ ] **Version affinity** configured for `front-app` gradual path.
- [ ] Alerts (or equivalent watched signals) exist for **version-differential errors/latency** and **`front-app` asset 404s**.
- [ ] Written reminder that rollback does not undo storage data / unbound config (even before those products land).
- [ ] At least one production gradual promote rehearsed end-to-end.

### Explicit non-goals until Stage 3+

- Automated progressive ramp policies and metric-gated auto-promote
- Treating Flagship as a required production dependency for every change (wire it first; make it load-bearing later)
- Multi-Worker RPC / Queue / DO CD playbooks as the default operating path
- Blanket merge → 100% traffic for all change classes
- Replacing GitHub Actions + Turbo with Workers Builds as the primary orchestrator

---

## 8. Assumptions and residual risks

### Assumptions

- Near-term production surface stays `worker-api` + `front-app` on Cloudflare Workers in this pnpm/Turborepo monorepo (not the sibling FastAPI/k8s template).
- Trunk-based development on `main`; `main` is kept releasable via small PRs and contract discipline.
- External GitHub Actions + Turbo `--affected` remain the orchestration source of truth.
- Privileged-data logging constraints remain in force.
- Flagship public beta is acceptable for release control once wired, provided safe defaults and server-side evaluation.
- Promote / pause / rollback authority for Stages 1–2 sits with deployable owners (or their on-call delegate); unresolved ownership blocks Stage 0→1 exit.

### Top risks if we follow this memo

1. Shared DTO change that types pass but breaks SPA runtime assumptions while versions ramp independently.
2. Gradual `front-app` deploy without affinity → asset 404s mistaken for “random flakes.”
3. Treating CI green as production proof and skipping version-diff / 404 signals.
4. Jumping to auto-ramp (model b/c) before Stage 1→2 checkboxes are real.
5. Using Worker rollback after an irreversible storage/schema change once those products exist.
6. Ignoring Flagship client-token constraints and embedding evaluate tokens in the SPA.

### Blocking open questions

Only these remain organizationally blocking; everything else in this memo is decided:

1. **Who holds promote / pause / rollback authority** for `worker-api` and `front-app` in the first six months (named humans or rota)?
2. **Who owns `@repo/dtos-common` / `@repo/enums-common`** for expand/contract window sign-off?

Non-blocking (decided here): affected-only vs always-all; model (a) for Stages 1–2; TTD ≤ 5m / TTM ≤ 15m; Flagship evaluation via `worker-api` binding; reject trains / blanket 100% / Builds-as-primary.

---

## Decision summary

1. **Stages 1–2 run model (a):** merge uploads immutable versions; humans promote (Stage 2 adds manual gradual + SPA affinity)—not auto-ramp yet.
2. **Deploy graph is affected-only;** shared DTO/enum changes default to coordinated multi-app versions; package edges ≠ future service-binding runtime skew.
3. **Change class gates:** routine may later auto; additive contracts coordinate; breaks/removals, bindings, and storage never auto and breaks need expand/contract on `main`.
4. **Binary vs behavior:** Workers gradual + affinity for code blast radius; Flagship (server-side on `worker-api`) for feature kill-switch—precedence favors flag disable over version rollback when the binary is otherwise healthy.
5. **No auto-ramp without** version-diff errors/latency, `front-app` asset-404 visibility, opaque request correlation, and ≤5m detect / ≤15m mitigate—CI green alone never authorizes production exposure policy.

---

## References

- Assessment (architecture): [continuous-deployment-workers.md](./continuous-deployment-workers.md) (§2, §5, §6, §8–§10)
- Stage 1–2 design (flows / runbooks / Stage 1 handoff): [cd-stage1-2-design.md](./cd-stage1-2-design.md)
- [Versions & deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [Deployment management](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/)
- [Gradual deployments](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/)
- [Version affinity](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/)
- [Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [Workers observability](https://developers.cloudflare.com/workers/observability/)
- [Workers CI/CD](https://developers.cloudflare.com/workers/ci-cd/)
- [Flagship](https://developers.cloudflare.com/flagship/)
- [Flagship best practices](https://developers.cloudflare.com/flagship/best-practices/)
- [Flagship client SDK warning](https://developers.cloudflare.com/flagship/sdk/client-provider/)
