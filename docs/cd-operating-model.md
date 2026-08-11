# Continuous Deployment Operating Model

> Organizational decision memo for this monorepo. Architecture and platform rationale live in [continuous-deployment-workers.md](./continuous-deployment-workers.md); this document states what we do for the next maturity stages so those basics are not re-litigated.

**Audience:** Engineers promoting Workers traffic, owning contracts, or designing Stage 1–2 CD workflows.

**Baseline (today):** CI is verify-only; deploy is manual `turbo run deploy` → `wrangler deploy --env production`; deployables are `worker-api` (Hono gateway) and `front-app` (Vite SPA on Workers assets); shared `@repo/dtos-common` + `@repo/enums-common`; staging env blocks exist but are not the default path; no KV/R2/DO/Queues in use yet. Stage 1 upload/promote separation and all Stage 2 controls are target state, not current capability.

The names above are logical deployable names. Wrangler named environments create separate production Worker resources named `<top-level-name>-production`; every record, override, promote, and rollback must use and display the actual production Worker name.

**Hard distinction:** Cloudflare **Worker version / gradual deployment / version affinity / rollback** control which **binary** serves traffic. **Flagship** controls which **behavior** runs inside already-deployed code. Do not conflate them.

---

## 1. Verdict

### Near-term model (Stages 1–2)

**Merge → version upload + manual promote.**

- On merge to `main`, eligible affected deployables get an immutable Worker **version uploaded**. An upload does not add that version to the active deployment and does not move production traffic.
- A two-version deployment that assigns the new version **0%** is a separate control-plane mutation used only for production-shaped override smoke. It is not equivalent to upload and is not progressive exposure.
- Stage 1 promotion replaces the active deployment with the selected version at **100%**. Stage 2 progressive exposure starts only when a human creates a two-version deployment with the new version above 0% and below 100%, then manually changes that percentage.
- No Stage 1 or Stage 2 action is an automated ramp. “Hold” means make no deployment change; there is no separate pause primitive.

This flow assumes each production Worker has already been published once. Cloudflare does not allow `versions upload` for the first upload; bootstrap uses the normal deploy path before production routes/domains or user traffic are attached, and is outside the recurring Stage 1 merge flow.

### Deferred target (Stage 3+)

**Gated full CD** — routine compute/UI may auto-ramp with metric gates; migrations, binding topology, and contract removals stay human-gated. This is Stage 3+ and must not be designed into the Stage 1–2 path.

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
| `worker-api` | Public HTTP gateway; production resource currently resolves to `worker-api-production` | App source, version-specific Wrangler settings, or any workspace package it bundles changes in a way Turbo marks the app affected for `build`. |
| `front-app` | Vite SPA served as Workers static assets; production resource currently resolves to `front-app-production` | Same rule; the production-environment Vite build must precede upload. |

No other `worker-*` / `queue-*` / `webhook-*` / `mcp-*` apps exist yet. When they appear, each is its own deployable; this memo’s package vs runtime-edge rules still apply.

### Mapping Turbo `--affected` → “new version required”

Treat Turbo’s affected graph for `build` as the **default upload set**. If an app would rebuild, it needs a new uploaded version before its change can serve production traffic. If it would not rebuild, do not upload a decorative new version.

The comparison base and head are release evidence. If CI cannot resolve the intended range or Turbo falls back to “everything changed,” fail closed: stop the upload or explicitly widen to both deployables. Never silently narrow the set. Account-level changes and Worker triggers (routes, domains, cron) are not made safe by uploading a version and require separate change control.

### Shared packages (`@repo/dtos-common`, `@repo/enums-common`)

- Workspace packages are JIT-bundled into each consumer artifact. A contract change that either app imports requires **coordinated consumer versions**—default: **both** `worker-api` and `front-app` get versions from the same commit and build inputs when the changed surface is shared wire format.
- “Coordinated” is not atomic. Cloudflare deployments are per Worker; there is no multi-Worker transaction, ordering guarantee, or joint rollback. Record both version IDs before traffic moves and use the compatibility order in §6.
- A single-app upload after a shared-package change is allowed only when the changed export is not in the other app’s artifact or wire behavior and the contract owner records that evidence. When uncertain, upload both.
- Additive contract PRs must update producers and consumers in the **same PR** (already a Contribution rule). That PR still yields multiple uploadable versions—one per affected deployable.

### Package edges vs service-binding edges

| Edge type | What freezes | Skew risk |
|-----------|--------------|-----------|
| Package (`workspace:*`) | Build-time: each Worker/SPA freezes its dependency closure into its version | Cross-deployable only when different apps are on different versions |
| HTTP (`front-app` → `worker-api`) | Runtime: each Worker ramps independently; the SPA also freezes `VITE_API_BASE_URL` at build time | N/N+1 and already-open browser sessions must remain compatible |

### Default policy: affected-only

**Default to affected-only.** Reject routine always-deploy-all: it widens blast radius, trains false confidence (“we redeployed everything so it must be fine”), and fights the Turbo model CI already uses. Explicitly widening to both deployables is the safe response to an uncertain graph or shared-wire impact; it must be recorded, not hidden.

---

## 3. Change classification (gate policy)

| Class | Auto-eligible (Stage 3+)? | Stages 1–2 promote | Forbidden on `main` without expand/contract window? |
|-------|---------------------------|--------------------|-----------------------------------------------------|
| Routine compute / UI | Yes, once auto-ramp gates exist | Manual promote; Stage 2 gradual path only after its prerequisites are met | No |
| Additive contract | No until all consumers have uploaded versions that understand the addition | Manual; coordinated multi-app versions | No — but same-PR consumer updates required |
| Breaking / removal contract | Never | Manual only after expand window complete and consumers migrated | **Yes** — expand → migrate consumers → contract |
| Binding topology / compatibility settings | Never | Manual; version-specific but not routine | N/A — separate change control; do not sneak into routine PRs |
| Routes / domains / cron triggers / connected resources / secret contents | Never | Separate control-plane change; `versions upload` does not apply triggers and rollback must not be assumed to restore external state | N/A |
| Storage / migration (future DO/KV/Queue/DB) | Never | Manual; disables “routine” promote path | N/A until products exist; when they do, migration PRs are explicitly labeled |
| Emergency hotfix | Manual fast-path only | May skip staging or gradual if delay risk exceeds cutover risk; verification, compatibility review, and the reason remain mandatory | Contract rules still apply — hotfixes do not license silent breaks |

**Classifier rule:** If a change touches wire schemas, Wrangler bindings, compatibility settings, triggers, connected resources, secret contents, or durable storage layout, it is **not** routine—even if types still pass.

---

## 4. Progressive delivery levers

### Workers gradual deployment (binary blast radius)

- **When used:** Stage 2 production promotes for non-trivial changes, after the observability and affinity gates below pass. One deployment can serve at most two versions; percentages are per-request routing probabilities, not exact cohort sizes or regional ordering.
- **`front-app` affinity:** Mandatory whenever traffic is split. Without it, HTML from one version can request a content-hashed JS/CSS file from the other version and receive a 404. The affinity key must be present on the first HTML request and every asset request. A cookie created in the first response cannot pin that first request.
- **Current blocker:** `front-app` is assets-only on `workers.dev`. Transform Rules require a route on a zone and do not operate on `workers.dev`; the browser cannot reliably attach a custom header to top-level navigation and asset requests. A production `front-app` split is therefore forbidden until a zone route/custom domain and a tested affinity-key source exist.
- **Key safety:** Use a dedicated random rollout identifier, not an auth/session secret, user/client/matter identifier, filename, or other privileged value. The version key participates in Workers cache partitioning and must be treated as infrastructure metadata.
- **Override safety:** A trusted zone boundary must remove or block untrusted `Cloudflare-Workers-Version-Overrides` throughout every two-version deployment. Otherwise a caller with a version ID can bypass the intended percentage.
- **SPA ↔ API skew:** Affinity pins **within** `front-app`. It does **not** lock `front-app` and `worker-api` to the same generation. HTTP contracts must tolerate N/N+1 and already-loaded SPA clients. Promote additive API support to 100% before exposing a dependent SPA; for removals, stop SPA use first and retain API compatibility for the measured client-retirement window.

Regional percentage-by-geography is **not** our primary lever.

### Flagship (behavior blast radius)

| Topic | Decision |
|-------|----------|
| Evaluation authority | Prefer **`worker-api` Flagship binding** (edge-local, no outbound HTTP, no app-managed token). |
| How `front-app` learns | API / bootstrap payload from `worker-api`. Do **not** ship Cloudflare API tokens in the browser OpenFeature client provider (docs: not recommended for public apps). |
| App / flag ownership | Organize apps by ownership boundary, but evaluate both API- and UI-owned decisions through `worker-api` while browser evaluation is unsafe. Flags have an owner, configured safe default variant, call-site fallback, and cleanup criterion. |
| Kill-switch vs Worker rollback | See precedence table below. |

**Precedence (mitigation order):**

| Situation | Prefer |
|-----------|--------|
| New feature / path causing errors; new version otherwise healthy | **Flagship kill-switch / disable, if wired and proven**; expect up to 30 seconds of mixed old/new evaluations |
| Regressed correct old behavior; no schema/storage change | **Worker version rollback** (promote prior version to 100%) |
| Bad or irreversible storage / message schema migration | **Forward fix** (or product PITR/restore)—not blind Worker rollback |
| Partial multi-app incompatible ramp | Hold both Workers; align versions in compatibility order; flag off risky paths only if proven |

Rollback selects a prior version’s binding declarations but does **not** recreate or rewind connected KV/R2/DO/D1/Queue resources or data, secret contents, triggers, or account-level routing. Cloudflare can block rollback if a bound resource no longer exists or a Durable Object lifecycle change intervened.

### Flagship public-beta risk acceptance

Flagship is not wired in this repository. Its public beta has no documented product SLA, so it is not a Stage 1–2 safety dependency. If adopted as the intended **deploy ≠ release** layer:

- Typed methods return the call-site `defaultValue` for known failures such as a missing flag or type mismatch; unexpected runtime failures can still throw. Callers must convert those failures to the same safe behavior.
- Disabling a flag returns the flag’s configured default variant; that variant must be the safe behavior. It is distinct from the typed method’s call-site fallback.
- Changes can take up to **30 seconds** to reflect globally, during which evaluations may disagree. A kill-switch is not an instantaneous global stop.
- Browser bootstrap decisions have a bounded lifetime and refresh path. Privileged operations enforce the safe decision server-side per request; a cached browser decision is never authorization.
- Flagship disable is not schema safety for queues/DO/DB and cannot repair an incompatible binary.
- Do not increase a Worker traffic percentage and a Flagship feature percentage for the same risky behavior at the same time. Change one exposure lever, observe it, then change the other.

Until Flagship is wired, incomplete features stay off by code path or simply do not merge; do not invent a second flag SaaS for the SPA.

---

## 5. Observability go/no-go bar

### Minimum signals for Stage 2

Stage 2 is forbidden until an operator can use all of these during the ramp:

1. **Version-attributed invocation outcomes** and runtime exceptions from a verified dashboard view, Logpush `ScriptVersion`, or version-metadata instrumentation. Do not assume the default aggregate Worker view supplies every required version dimension.
2. **Application HTTP 5xx rate by version.** A Worker invocation can be “Success” while returning an HTTP error, so runtime error charts alone are insufficient.
3. **Version-attributed wall/CPU time** or an explicitly instrumented response-latency SLI. Wall time includes I/O and `waitUntil`; it is not guaranteed to equal client final-byte latency. Do not label a quantile “request latency” unless that is what the source measures.
4. **`front-app` asset 404 rate** during splits. Cloudflare recommends Analytics Engine or Logpush for this; it is not currently configured in the repository.
5. **Opaque request IDs** correlating `front-app` → `worker-api`. The API emits an ID today, but the SPA does not propagate one end to end; treat correlation as an unmet prerequisite.

No client/matter identifier or privileged content may appear in logs, traces, metric dimensions, error bodies, cache keys, URLs, affinity keys, or Flagship context. CI green is necessary and insufficient.

### Detection and mitigation targets

| Metric | Target | Justification |
|--------|--------|---------------|
| Time-to-detect | **≤ 5 minutes** after a ramp step | Internal operating objective, not a Cloudflare SLA. Recent metrics can lag; if the objective cannot be measured, hold. |
| Time-to-mitigate | **≤ 15 minutes** | Internal drill/incident objective, not a propagation guarantee. Mitigation is not complete until the active deployment and probes are verified. |

Each ramp step needs a declared minimum bake duration and sample count appropriate to traffic. If the new version has too little traffic, telemetry is delayed, or signals disagree, **hold**; lack of evidence is never permission to advance.

### Not required yet (deferred)

- Full OpenTelemetry export / third-party APM as a gate
- Automated pause/rollback robots
- Queue depth, DLQ, or DO-specific SLIs (products not in use)
- Perfect business SLI dashboards beyond the existing health probe and the signals above

---

## 6. Compatibility policy

Enforceable standing rules for HTTP DTOs in `@repo/dtos-common` (and later RPC/queue schemas in the same package):

1. **Expand/contract only.** Add optional fields and additive enum members first. Consumers adopt. Removals and renames happen only after the expand window.
2. **N and N+1 must coexist** across `front-app` ↔ `worker-api` whenever either side can deploy independently. Reaching 100% SPA traffic does not retire JavaScript already loaded in open tabs.
3. **Same-PR discipline** for additive wire changes that require consumer updates; never leave `main` with a producer that emits a shape no live consumer understands—or a consumer that requires a field no live producer emits—without an explicit compatibility window.
4. **Contract evidence is required.** Shared wire changes need HTTP contract tests or equivalent recorded producer/consumer evidence before promote. App Vitest suites cover the current GET /api/v1/health producer/consumer contract; types alone do not satisfy this gate for new shared wire shapes.
5. **What disables promote / future auto-ramp:**
   - Known breaking or removal contract on `main` without a completed expand/migrate window
   - Incomplete consumer uploads for an additive contract that those consumers must understand before traffic moves
   - Missing contract evidence for a shared wire change
   - Missing version attribution, application-5xx visibility, or `front-app` asset-404 visibility for a gradual promote path
   - Any binding, trigger, connected-resource, secret-content, or storage/migration change treated as “routine”

Privileged legal-domain data rules still apply while debugging skew: no matter/client identifiers in telemetry.

---

## 7. Maturity exit criteria

### Stage 0 → 1

- [ ] CI remains the merge gate (boundaries, lint, format, affected typecheck/test/build).
- [ ] Version **upload without immediate 100% traffic** practiced until boring on a non-critical path.
- [ ] **Rollback drill** completed (time-to-mitigate measured; “what rollback does not undo” understood).
- [ ] Named owners for `worker-api`, `front-app`, and shared contracts.
- [ ] Access-protected preview or trusted 0%-override smoke is a real habit; public preview URLs are not accepted by default.
- [x] Shared HTTP changes have contract evidence; Vitest covers the current /api/v1/health producer/consumer contract (extend the suite when adding wire).

### Stage 1 → 2

- [ ] Production promotes can use **gradual percentage** splits for both deployables.
- [ ] `front-app` is on a zone route/custom domain and **version affinity** is verified from the first HTML request through asset fetches.
- [ ] Alerts or a continuously staffed ramp dashboard expose version-attributed runtime failures, application 5xx, measured performance, and `front-app` asset 404s.
- [ ] End-to-end opaque request correlation is verified without privileged identifiers.
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
- The credential used for version upload is a production-capable principal: Cloudflare documents broad Workers script-edit authority for version and deployment writes, not an upload-only permission. Human promotion requires a protected boundary CI cannot invoke.
- Privileged-data logging constraints remain in force.
- Flagship public beta may be evaluated for release control once wired, but it is not a Stage 1–2 safety dependency without an explicit fallback and accepted beta risk.
- Promote / hold / rollback authority for Stages 1–2 sits with the deployable owner or on-call delegate. The role is decided; named assignments still block Stage 0→1 exit.

### Top risks if we follow this memo

1. Shared DTO change that types pass but breaks SPA runtime assumptions while versions ramp independently.
2. Gradual `front-app` deploy on the current `workers.dev` posture, or without first-request affinity → asset 404s mistaken for “random flakes.”
3. Treating runtime invocation success as application success and missing HTTP 5xx or asset 404s.
4. Treating CI green as production proof or advancing with delayed/insufficient samples.
5. Using Worker rollback after an irreversible storage/schema change once those products exist.
6. Treating a public-beta Flagship kill as instantaneous or embedding its API token in the SPA.
7. Publishing a production-bound version at a public preview URL without Access, then sending privileged smoke traffic to it.
8. Treating workflow separation as authorization even though the CI Worker-write credential can mutate production.

### Required assignments before Stage 1

The authority model is decided, but these names are not present in the repository:

1. Named deployable owner or on-call rota for `worker-api` and `front-app`.
2. Named owner for `@repo/dtos-common` / `@repo/enums-common` expand/contract sign-off.

Affected-only, manual authority, internal TTD/TTM objectives, server-side Flagship evaluation, and rejection of trains / blanket 100% / Builds-as-primary are decided here.

---

## Decision summary

1. **Stages 1–2:** merge uploads immutable versions; humans create deployments. Stage 1 selects 100%; Stage 2 manually progresses a two-version split after affinity and observability prerequisites pass.
2. **Deploy graph is affected-only by default;** uncertain impact widens explicitly. Shared contract versions are ordered and verified per Worker—never atomic.
3. **Change class gates:** routine may later auto; additive contracts coordinate; removals require expand/contract plus client retirement; triggers, external resource state, bindings, and storage never ride the routine path.
4. **Binary vs behavior:** Workers gradual + affinity control binary exposure. Flagship, if wired, controls behavior; it is beta, can take 30 seconds to propagate, and is not a schema or binary rollback.
5. **Stage 2 stays closed without** version-attributed runtime and HTTP signals, measured performance, asset-404 visibility, first-request SPA affinity, opaque correlation, and an on-call decision path.

---

## References

- Assessment (architecture): [continuous-deployment-workers.md](./continuous-deployment-workers.md) (§2, §5, §6, §8–§10)
- Stage 1–2 design (flows / runbooks / Stage 1 handoff): [cd-stage1-2-design.md](./cd-stage1-2-design.md)
- Implementation evidence (platform facts, repo map, diagrams, release schemas, Cursor starters): [cd-stage1-2-implementation-evidence.md](./cd-stage1-2-implementation-evidence.md)
- [Versions & deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [Deployment management](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/)
- [Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/)
- [Version overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/)
- [Gradual deployments](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/)
- [Version affinity](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/)
- [Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [Workers observability](https://developers.cloudflare.com/workers/observability/)
- [Workers metrics and analytics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/)
- [Workers cache keys](https://developers.cloudflare.com/workers/cache/cache-keys/)
- [Workers CI/CD](https://developers.cloudflare.com/workers/ci-cd/)
- [Flagship](https://developers.cloudflare.com/flagship/)
- [Flagship concepts](https://developers.cloudflare.com/flagship/concepts/)
- [Flagship binding methods](https://developers.cloudflare.com/flagship/binding/methods/)
- [Flagship best practices](https://developers.cloudflare.com/flagship/best-practices/)
- [Flagship client SDK warning](https://developers.cloudflare.com/flagship/sdk/client-provider/)
