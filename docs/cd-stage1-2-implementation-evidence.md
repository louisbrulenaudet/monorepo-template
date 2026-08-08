# Stage 1–2 CD Implementation Evidence

> Agent-facing evidence pack for implementing [cd-operating-model.md](./cd-operating-model.md) and [cd-stage1-2-design.md](./cd-stage1-2-design.md). This is not a third decision document: the architectural assessment and operating model remain authoritative.

**Scope:** Stage 1 version delivery and Stage 2 manual progressive exposure for `worker-api` and `front-app` only. No CI YAML, Wrangler configuration, or application implementation is prescribed here.

**Last evidence review:** 2026-08-08. Cloudflare behavior changes; reverify every platform claim immediately before implementation. During the original review, Context7 was quota-blocked, so no conclusion depends on Context7 output. Official Cloudflare Documentation MCP results and direct official pages were used.

**Contents for future Cursor chats:** platform ledger (§2), repo reality (§3), acceptance crosswalk (§4), research procedure (§5), uncertainties (§6), blockers (§7), source index (§8), how to `@`-load this pack (§9), vocabulary (§10), state/control diagrams (§11), evidence/release schemas (§12), copy-paste conversation starters (§13), anti-patterns (§14), and JSON handoff shapes (§15). The design doc also has Mermaid flows; this guide restates the control model as tables/ASCII so agents can reason without depending on a renderer.

---

## 1. Source hierarchy

1. [continuous-deployment-workers.md](./continuous-deployment-workers.md) — architectural source of truth.
2. [cd-operating-model.md](./cd-operating-model.md) — Stage 1–2 decisions, gates, and ownership model.
3. [cd-stage1-2-design.md](./cd-stage1-2-design.md) — operator flows, failure modes, and runbooks.
4. This guide — evidence, repository observations, research procedure, and implementation acceptance evidence.
5. Current official Cloudflare documentation — factual authority for platform behavior. If it changed, update the affected docs together rather than preserving a stale local claim.

Classify every claim as **platform-documented**, **repo-observed**, **operating policy**, or **unverified**. Never convert an operating target, such as TTD ≤ 5 minutes, into a claimed Cloudflare SLA.

---

## 2. Platform evidence ledger

Unless explicitly labeled otherwise, each sourced bullet below is **platform-documented**. Derived controls are **operating policy**; absence-of-guarantee statements are **unverified** and must not be promoted into platform facts.

### Versions, deployments, and triggers

- A version captures bundled code, static assets, bindings, and compatibility settings—not storage state. Record a version ID as artifact identity, never as an environment snapshot. Source: [Versions & deployments](https://developers.cloudflare.com/workers/versions-and-deployments/).
- `wrangler deploy` creates a version and immediately deploys it to 100%; `wrangler versions upload` creates a version without changing the active deployment. Stage 1 needs separate upload and human-promotion paths. Source: [Deployment management](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/).
- The first upload cannot use `versions upload`. Bootstrap before production routes/domains or user traffic attach; keep bootstrap out of the recurring merge flow. Source: [First upload](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/#first-upload).
- A deployment serves one version at 100%, or two versions during a split. There is no three-version canary. Finish or roll back one split before introducing another version. Source: [Versions & deployments](https://developers.cloudflare.com/workers/versions-and-deployments/).
- Deployments can select the 100 most recent uploads; rollback can select the 100 most recently published versions. Do not collapse these into “the last 100 versions.” Sources: [deployment limits](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/#limits), [rollback limits](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/#limits).
- Routes, domains, and cron triggers are not applied by `versions upload`. They need separate change control. Source: [Upload a version](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/#upload-a-version-without-deploying).
- Wrangler named environments create separate suffixed Workers. Release records and overrides use actual names such as `worker-api-production`, not only package names. Source: [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/).

### Gradual deployment and affinity

- Without affinity, each request independently routes according to configured percentages. Percentages are probabilities, not exact cohort sizes, request counts, regions, or ordering. Source: [Gradual deployments](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/).
- `Cloudflare-Workers-Version-Key` is hashed to select a version; assignments remain monotonic as the new-version percentage increases. Operators do not select a key’s version. Source: [Version affinity](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/).
- HTML and content-hashed assets can route to different versions and 404 without affinity. `front-app` cannot split until first-request-through-assets affinity and asset-404 visibility are proven. Source: [Static assets](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/#static-assets).
- A cookie created by the first response cannot pin the first randomly routed request. The affinity key must pre-exist the first HTML request. Source: [Anonymous applications](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/#anonymous-or-cookieless-applications).
- Transform Rules require a route on a controlled zone and are unavailable on `workers.dev`. The current `front-app` posture therefore blocks Stage 2. Source: [Static-assets gradual rollouts](https://developers.cloudflare.com/workers/static-assets/routing/advanced/gradual-rollouts/).
- The affinity header contributes to Workers cache partitioning. Use a dedicated random rollout value—never an auth token, user/client/matter identifier, filename, or privileged value. Source: [Workers cache keys](https://developers.cloudflare.com/workers/cache/cache-keys/).

### Preview URLs and version overrides

- Enabled preview URLs are public unless Cloudflare Access protects them. A production-bound preview is a production exposure surface. Source: [Manage preview access](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/#manage-access-to-preview-urls).
- Preview URLs have no Workers Logs, `wrangler tail`, or Logpush and do not exercise zone-level controls. Preview smoke proves boot/shell only. Source: [Preview limitations](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/#limitations).
- `preview_urls` defaults to `workers_dev`; current documented behavior enables both when neither is configured. Omission is not a deny. Source: [Preview toggle](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/#toggle-preview-urls-enable-or-disable).
- An override applies only when its version is in the current two-version deployment; a new version may be assigned 0%. A 0% smoke is a deployment mutation, not upload. Source: [Override smoke](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/#smoke-test-example).
- Invalid, unavailable, or not-yet-propagated overrides fall back to percentage routing; recent changes can take up to a couple of seconds to become globally available. The smoke runner must verify the served version and fail closed. Source: [Verify overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/#verify-that-version-overrides-were-applied).
- External requests can supply the override header. **Operating policy derived from documented behavior:** block/remove untrusted overrides throughout every two-version deployment, or a caller with a version ID can bypass percentage containment. Source: [Version overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/).

### Rollback

- Rollback creates a new single-version deployment at 100%; from a split it replaces both versions. Verify the active deployment before declaring mitigation. Source: [Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
- Connected resources and stored data are not rewound. Never describe rollback as restoring storage, secret contents, triggers, routes, DNS, or external configuration. Source: [Rollback bindings](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/#bindings).
- Missing resource targets and Durable Object lifecycle changes can block rollback. The runbook needs a compatible forward-fix path. Source: [Rollback bindings](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/#bindings).
- **Unverified absence plus operating policy:** no official multi-Worker transaction was found. Treat `worker-api` and `front-app` promotion/rollback as ordered, independently verified operations.

### Observability

- Invocation errors are runtime outcomes, not HTTP status codes. A successful invocation can return application 5xx. Stage 2 needs both signals. Source: [Invocation statuses](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/#invocation-statuses).
- Wall time includes I/O and `waitUntil`; it is not final-byte response latency. Name every performance signal by what it measures. Source: [Metrics and analytics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/).
- Sampled/aggregated quantiles and recent-minute lag require a declared bake and sample count. Delayed or insufficient evidence means hold. Source: [Metrics and analytics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/).
- Version identity is available through Logpush `ScriptVersion` and the version metadata binding. Verify actual dashboard/export dimensions; do not assume every default chart can gate by version. Sources: [Gradual observability](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/#observability), [version metadata](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/).
- Cloudflare recommends Analytics Engine or Logpush for asset-404 monitoring. Treat this as an explicit Stage 2 prerequisite. Source: [Affinity testing](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/#testing).

### Flagship

- The Workers binding handles authentication and avoids app-managed API tokens. Evaluate at `worker-api`; send only bounded, advisory UI decisions to `front-app`. Source: [Flagship best practices](https://developers.cloudflare.com/flagship/best-practices/).
- The browser client provider exposes a Cloudflare API token and is not recommended for public apps. Never put it in `front-app`. Source: [Client provider](https://developers.cloudflare.com/flagship/sdk/client-provider/).
- Typed methods use the caller fallback for known failures/type mismatch; unexpected runtime failures can throw. Catch them into the same safe behavior. Source: [Binding methods](https://developers.cloudflare.com/flagship/binding/methods/).
- Disabling a flag serves its configured default variant. That variant and the call-site fallback are separate controls; both must be safe. Source: [Flagship concepts](https://developers.cloudflare.com/flagship/concepts/).
- Changes can take up to 30 seconds to reflect globally. A saved kill-switch is not instant mitigation. Source: [Flag propagation](https://developers.cloudflare.com/flagship/concepts/#flag-propagation).
- Rollout is sticky only with a stable bucketing attribute; without one, evaluations can be random. Use a dedicated opaque rollout key, never client/matter data. Source: [Percentage rollouts](https://developers.cloudflare.com/flagship/targeting/percentage-rollouts/).
- Flagship entered public beta in May 2026. No product-specific SLA was located during this review. Treat the SLA as unverified and keep Flagship non-load-bearing unless risk/fallback is accepted. Source: [Public beta](https://developers.cloudflare.com/changelog/post/2026-05-26-public-beta/).

---

## 3. Repository reality map

Every bullet in this section is **repo-observed** as of the evidence-review date and must be rechecked after relevant repository changes.

- **CI:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) verifies boundaries, lint, format, affected typecheck/build; it has no upload/promote job. Full history supports affected correctness. Stage 1 automation is target state.
- **Deploy scripts:** both app package files use `wrangler deploy --env production`, so current deploy is upload plus immediate 100%.
- **Turbo:** [`turbo.json`](../turbo.json) models affected builds; `front-app#deploy` depends on its build. Use the affected **build** graph to select uploads.
- **Shared contracts:** both apps depend directly on `@repo/dtos-common` and `@repo/enums-common`. Shared-wire changes normally upload both consumers from one commit. Types do not prove runtime compatibility.
- **Production resources:** named production environments resolve to `worker-api-production` and `front-app-production`; verify remote names before acting.
- **`front-app`:** [`apps/front-app/wrangler.jsonc`](../apps/front-app/wrangler.jsonc) is assets-only with `workers_dev: true`, `preview_urls: false`, and SPA fallback. Transform Rule affinity needs a zone route/custom domain.
- **`worker-api`:** [`apps/worker-api/wrangler.jsonc`](../apps/worker-api/wrangler.jsonc) leaves `workers_dev` and `preview_urls` unset. Current documented defaults enable both; explicitly disable preview or verify Access and remote state.
- **SPA/API coupling:** [`apps/front-app/vite.config.ts`](../apps/front-app/vite.config.ts) bakes `VITE_API_BASE_URL`; assets are immutable while HTML revalidates. Record the API origin with every SPA version. Open clients outlive a 100% SPA promote.
- **Smoke route:** only `GET /api/v1/health` exists. Do not document `/ready` until implemented.
- **Correlation:** the API creates/exposes an opaque request ID; the SPA does not propagate one end to end. Correlation is a Stage 2 prerequisite, not current capability.
- **Stateful products:** no KV/R2/DO/D1/Queue bindings exist. Their migration playbooks remain out of scope.
- **Flagship:** no binding or evaluation path exists. Runbooks must work without a flag kill-switch.
- **Tests/signals:** no contract test suite, version-attributed application-5xx gate, or asset-404 alert exists. Stage 2 is closed.

---

## 4. Acceptance-evidence crosswalk

This section is **operating policy** and follows the authoritative Stage 1 work-package order in [cd-stage1-2-design.md](./cd-stage1-2-design.md#e-implementation-handoff--stage-1-only); it does not define a second implementation plan.

1. **Bootstrap inventory:** evidence includes actual Worker names, previous publication, routes/domains, and active deployments.
2. **Protected smoke path:** evidence includes Access posture or trusted 0%-override controls, served-version verification, synthetic probes, and restoration after abort.
3. **Scripts split:** evidence shows recurring upload and human deployment are distinct paths; bootstrap is explicitly excluded.
4. **Build provenance:** evidence includes commit, affected base/head, actual Worker, version ID/tag, build inputs, and SPA API origin.
5. **CI upload job:** evidence includes affected packages, selected deployables, build/upload result, and reason for explicit widening. Silent narrowing is forbidden.
6. **Credential boundary:** both [create version](https://developers.cloudflare.com/api/resources/workers/subresources/beta/subresources/workers/subresources/versions/methods/create/) and [create deployment](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/create/) use the broad Workers script-edit authority. No upload-only permission was documented. Require a protected approval/broker boundary CI cannot invoke. Evidence includes principal inventory, dated endpoint/permission sources, approval path, revocation owner, and audit source—never token values.
7. **Smoke and contract checklist:** evidence includes existing health/asset probes and old/new producer-consumer compatibility. Additive API support reaches 100% before a dependent SPA; removal waits for measured open-client retirement.
8. **Owners and drill:** evidence includes named app/contract owners, one operator per change, rollback/blocked-rollback results, before/after deployments, probes, and TTD/TTM.
9. **Documentation pointers:** evidence includes current cross-links from implementation surfaces to the operating model, design, and this evidence guide.

### Stage 2 entry gate

Stage 2 remains closed until:

1. `front-app` runs on a controlled zone route/custom domain.
2. A non-privileged affinity key exists before first HTML and persists through asset requests.
3. Untrusted affinity/override headers are overwritten or blocked.
4. Version-attributed runtime failures, HTTP 5xx, accurately named performance signals, and asset 404s exist.
5. End-to-end opaque request correlation is verified.
6. Bake, sample, advance, and rollback thresholds are declared per ramp.
7. Additive API-first and removal API-last/open-client-retirement order is rehearsed.
8. Partial promote, wrong-version, delayed-metrics, asset-404, and blocked-rollback drills pass.

No fixed 10→50→100 ladder is authoritative. Choose percentages from traffic volume and risk; insufficient evidence means hold.

---

## 5. Research procedure for future agents

### Official-source retrieval

1. Discover the current Cloudflare Documentation MCP schema before calling it.
2. Search one platform concept per query. High-value query themes:
   - Workers versions/deployments, upload separation, first upload, and limits.
   - Two-version gradual traffic, affinity, first-request cookie behavior, and static assets.
   - Preview publicity/Access/log limitations/defaults and override fallback/propagation.
   - Rollback resource/data constraints and Durable Object lifecycle.
   - Invocation versus HTTP status, wall time, version metadata, and `ScriptVersion`.
   - Version/create-deployment API permissions and `Workers Scripts Edit`.
   - Flagship binding defaults/errors, disabled variant, propagation, rollout bucketing, browser token, beta/SLA.
3. Use Context7 independently: resolve the official Cloudflare Workers project ID first, then query one concept at a time. If unavailable or quota-blocked, record it; an attempted call is not corroboration.
4. Fetch the official page Markdown form ending in `/index.md` when semantic search returns only a partial chunk or changelog.
5. Record URL, page update date when shown, retrieval date, exact claim, limitations, and operational consequence.
6. Prefer current reference pages over announcements. Use changelogs for dated status facts such as public beta.

### Repository verification

Inspect the CI workflow, root package/Turbo files, both apps’ package/Turbo/Wrangler files, `front-app` Vite config, the health route, SPA fetch utility, and app package dependencies.

Do not infer remote Cloudflare state from local omission. Verify remote names, routes, preview/Access posture, active deployments, connected resources, and permissions through an authorized read-only source.

### Claim discipline

Use the smallest defensible statement:

- “Per-request probability,” not “exactly 10% of users.”
- “Per-Worker ordered operations,” not “coordinated atomic deployment.”
- “Up to a couple of seconds is documented for recent override availability,” not “instant global deployment.”
- “Known Flagship failures use fallback; unexpected failures may throw,” not “Flagship always fails safe.”
- “Invocation success,” not “HTTP success.”
- “Rollback selects a prior binary/config version,” not “rollback restores production.”
- “No upload-only permission was documented,” not “the CI token cannot deploy.”

For each nontrivial claim, record: classification, source URL or repository path, observation date, exact behavior, exclusions, operational consequence, and reverification trigger.

Never put production tokens, client/matter identifiers, request bodies, document names/content, or privileged URLs into evidence records or MCP queries.

---

## 6. Explicit uncertainties

Do not claim these without new official evidence:

- Atomic promotion, ordering, or rollback across `worker-api` and `front-app`.
- A bounded zero-time global Worker deployment or rollback.
- Exact cohort size at low traffic or region-by-region rollout.
- Preview isolation from production bindings/resources.
- Automatic version attribution for every dashboard metric or alert.
- Application HTTP success from a successful Worker invocation.
- Storage, secret, trigger, route, DNS, or connected-resource restoration on rollback.
- Upload-only authorization from a generic Worker-write CI credential.
- A Flagship public-beta SLA or instant global kill.
- Safety of a browser-cached flag for authorization or privileged operations.

If a required fact remains uncertain, block the stage or add a control that does not depend on the claim.

---

## 7. Implementation blockers by stage

### Stage 1 exit blockers

1. Named deployable owner/on-call rota and named shared-contract owner.
2. Verified remote names, active deployments, routes/domains, preview status, and Access policy.
3. A protected promotion boundary the CI upload principal cannot invoke.
4. Contract compatibility evidence for shared wire changes.
5. Protected smoke with served-version verification and override-header control.
6. Successful rollback and blocked-rollback drills with recorded TTD/TTM.

### Stage 2 entry blockers

1. Zone route/custom domain plus first-request SPA affinity.
2. Version-attributed runtime, HTTP, performance, and asset-404 signals.
3. End-to-end opaque request correlation.
4. Ramp bake/sample/advance/rollback thresholds and incident owner.
5. Client-retirement measurement before API contract removal.

### Optional Flagship adoption blockers

1. Explicit public-beta/no-SLA risk and fallback acceptance.
2. Safe configured default variant and safe call-site/runtime failure behavior.
3. Bounded SPA bootstrap freshness and server-side enforcement for privileged operations.

A planned implementation is not completion. Stage exit criteria remain unchecked until evidence is real.

---

## 8. Official source index

- [Versions & deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [Deployment management](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/)
- [Gradual deployments](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/)
- [Version affinity](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/)
- [Static-assets gradual rollouts](https://developers.cloudflare.com/workers/static-assets/routing/advanced/gradual-rollouts/)
- [Version overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/)
- [Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/)
- [Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [Workers metrics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/)
- [Version metadata](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/)
- [Workers cache keys](https://developers.cloudflare.com/workers/cache/cache-keys/)
- [API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [Create Worker version](https://developers.cloudflare.com/api/resources/workers/subresources/beta/subresources/workers/subresources/versions/methods/create/)
- [Create deployment](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/create/)
- [Flagship](https://developers.cloudflare.com/flagship/)
- [Flagship concepts](https://developers.cloudflare.com/flagship/concepts/)
- [Flagship binding methods](https://developers.cloudflare.com/flagship/binding/methods/)
- [Flagship percentage rollouts](https://developers.cloudflare.com/flagship/targeting/percentage-rollouts/)
- [Flagship client provider](https://developers.cloudflare.com/flagship/sdk/client-provider/)
- [Flagship public beta](https://developers.cloudflare.com/changelog/post/2026-05-26-public-beta/)

---

## 9. How to use this guide in Cursor

Load this file **with** the operating model and design, not instead of them. Suggested `@` order for an implementation or design chat:

1. `@docs/cd-operating-model.md` — decisions already locked
2. `@docs/cd-stage1-2-design.md` — flows, runbooks, Stage 1 work packages
3. `@docs/cd-stage1-2-implementation-evidence.md` — this evidence pack
4. Only if architecture is in dispute: `@docs/continuous-deployment-workers.md`

Then constrain the agent:

- Stage 1–2 only; no Stage 3+ auto-ramp design
- Docs/process only unless the user explicitly asks for CI YAML, Wrangler, or app code
- Reverify every **platform-documented** claim via Cloudflare Documentation MCP + official `/index.md` before coding against it
- Classify every new claim; never promote operating targets (TTD/TTM) into Cloudflare SLAs
- Prefer diagrams and schemas in this guide when explaining state; do not invent a second decision memo

**Stale wording elsewhere:** [continuous-deployment-workers.md](./continuous-deployment-workers.md) once summarized rollbacks as “100 versions.” Prefer the precise split here and in the design: **100 most recent uploads** for deployment selection vs **100 most recently published** for rollback. Prefer this guide + design over collapsed phrasing in older assessment prose.

---

## 10. Shared vocabulary

| Term | Exact meaning in this monorepo |
|------|--------------------------------|
| **Upload** | `wrangler versions upload` (or equivalent API): creates an immutable version; does **not** change the active deployment. |
| **Promote / deploy** | Creates a deployment that can serve traffic. Stage 1 promote = new version at **100%**. |
| **0% smoke** | A **deployment** that includes the new version at 0% so overrides can target it. Not upload; not Stage 2 progressive exposure. |
| **Stage 2 split** | Two-version deployment with new version **> 0% and < 100%**. |
| **Hold** | Make **no** deployment mutation. Not a platform “pause” object. |
| **Rollback** | New single-version deployment at 100% selecting a prior published version. Does not rewind storage/secrets/routes/DNS. |
| **Affinity key** | Dedicated opaque `Cloudflare-Workers-Version-Key` value, present before first HTML; never client/matter/auth secret. |
| **Override** | `Cloudflare-Workers-Version-Overrides` for trusted smoke only; fail-open to % routing if invalid/unpropagated. |
| **Flagship** | In-process behavior flagging; never substitutes for upload/promote/rollback. |
| **Actual Worker name** | e.g. `worker-api-production`, not only the package name `worker-api`. |

---

## 11. State model and control diagrams

These are **operating-policy visualizations** of platform-documented primitives. Prefer them (and the Mermaid flows already in the design doc) over inventing a new state language mid-chat.

### 11.1 Per-Worker version / deployment states

| State | Traffic meaning | How you enter | Valid next moves |
|-------|-----------------|---------------|------------------|
| `never_published` | No Worker yet | New script | Bootstrap with first `wrangler deploy` only (not recurring `versions upload`) |
| `active_100` | One version at 100% | Promote, complete, rollback, or bootstrap | Upload new inactive version; start Stage 2 split |
| `inactive_uploaded` | New version exists; **not** in active deployment | `versions upload` | Leave idle; promote to 100%; or deploy at 0% for override smoke |
| `two_version_0` | New version in deployment at 0% | Production-shaped smoke | Abort and restore prior 100%; promote new to 100%; raise above 0% (enters Stage 2) |
| `stage2_split` | Two versions; new in (0%, 100%) | Human starts non-zero split | Hold (no mutation); advance %; complete to new 100%; rollback to prior 100% |

Transition summary (read as “from / event / to”):

1. `never_published` / bootstrap deploy / `active_100`
2. `active_100` / versions upload / `inactive_uploaded`
3. `inactive_uploaded` / promote 100% / `active_100`
4. `inactive_uploaded` / deploy new at 0% / `two_version_0`
5. `two_version_0` / abort restore prior / `active_100`
6. `two_version_0` / promote new 100% / `active_100`
7. `two_version_0` / raise new above 0% / `stage2_split`
8. `active_100` / start non-zero split / `stage2_split`
9. `stage2_split` / hold / `stage2_split`
10. `stage2_split` / advance / `stage2_split`
11. `stage2_split` / complete or rollback / `active_100`

Upload is not a 0% deploy. A 0% deploy is not Stage 1 promote. Stage 1 promote is not a Stage 2 split. Mixing those four is the most common agent error.

### 11.2 Stage 1 decision spine

1. Merge to `main` after verify is green.
2. Compute the Turbo affected **build** graph; record base and head.
3. If the graph is unresolved or would silently narrow: stop, or explicitly widen both deployables and record why.
4. Otherwise run `versions upload` only (no traffic mutation).
5. Record version IDs and provenance (actual Worker name, commit, SPA API origin when relevant).
6. Smoke:
   - Access-protected preview: boot or shell only.
   - Zone behavior required: deploy new at 0%, trusted override, verify served version, fail closed if unverified.
7. Human decision:
   - Promote 100%, then verify active deployment and probes.
   - Abort after preview: leave the version inactive.
   - Abort after 0%: restore prior 100% so the 0% deployment does not linger unbound.

### 11.3 Stage 2 operator loop

1. If the Stage 2 entry gate fails, remain Stage 1 only.
2. Human starts a non-zero split and records bake, sample, and rollback thresholds first.
3. Watch version-attributed runtime failures, application HTTP 5xx, accurately named latency, and asset 404s.
4. Decide:
   - **hold** — no control-plane change; keep watching.
   - **advance** — raise new-version percent; return to watch.
   - **complete** — new version at 100%; verify active state.
   - **rollback** — prior version at 100%; verify active state.

Insufficient bake, sample, or delayed metrics means **hold**, never advance on hope.

### 11.4 SPA ↔ API promote and rollback order

**Additive contract**

1. Upload API and SPA versions from the same commit when the wire surface is shared.
2. Promote API support to 100% and verify the old SPA still works.
3. Then ramp or promote the dependent SPA.

**Removal contract**

1. Ramp SPA off the old shape to 100%.
2. Keep API compatibility through a measured open-client retirement window.
3. Remove the API shape in a later change.

**Partial-pair rollback**

1. There is no joint Cloudflare rollback across Workers.
2. Check live counterpart compatibility before one-sided rollback.
3. Roll one Worker only when the other remains safe; otherwise forward-fix or use coordinated sequenced rolls.

### 11.5 Mitigation precedence during an incident

1. Detect bad signals.
2. If the wrong binary is serving, or the cause is unknown or mixed: mitigate with deployment controls first (hold, abort, or rollback to prior 100%), verify active deployment and probes, then close out with TTD/TTM, versions, residual risk, and opaque request IDs only.
3. If the binary is known-good and only in-process behavior is wrong, and Flagship is wired and proven: try the safe flag default. If still bad, fall through to deployment mitigation.
4. Never invert that order: deployment selects the binary; Flagship only reshapes behavior inside an already-serving binary.

---

## 12. Evidence and release-record schemas

Use these field lists as conversation contracts. They are documentation schemas, not runtime Zod/Pydantic types. Never store secrets, Access bearer values, client/matter IDs, privileged URLs, or document content in these records.

### 12.1 Claim evidence record

| Field | Required | Notes |
|-------|----------|-------|
| `claim` | yes | Smallest defensible statement |
| `classification` | yes | `platform-documented` \| `repo-observed` \| `operating-policy` \| `unverified` |
| `source` | yes | Official URL or repository path |
| `retrieved_on` | yes | ISO date of this review |
| `page_updated_on` | no | When the official page shows it |
| `exact_behavior` | yes | What the source actually says |
| `exclusions` | yes | What it does **not** guarantee |
| `operational_consequence` | yes | What Stage 1/2 must do differently |
| `reverify_trigger` | yes | e.g. before coding upload job; before first SPA split |

### 12.2 Immutable release / upload record

| Field | Required | Notes |
|-------|----------|-------|
| `commit_sha` | yes | |
| `affected_base` / `affected_head` | yes | Fail closed if unresolved |
| `affected_packages` | yes | As Turbo reported |
| `selected_deployables` | yes | Subset actually uploaded |
| `widen_reason` | when widened | Explicit; never silent narrow |
| `actual_worker_name` | yes | e.g. `front-app-production` |
| `version_id` | yes | Cloudflare version identity |
| `build_inputs` | yes | Enough to reproduce; include SPA `VITE_API_BASE_URL` |
| `previous_active_deployment` | yes | Before any mutation |
| `smoke_method` | yes | `protected_preview` \| `zero_pct_override` \| `staging` \| `skipped_with_reason` |
| `served_version_verified` | when smoked | Fail closed if false |
| `operator` | before promote | Single human |
| `decision` | yes | `leave_inactive` \| `promote_100` \| `abort_restore` \| `start_split` |
| `post_active_deployment` | after mutation | Verify before closing |

### 12.3 Stage 2 ramp step record

| Field | Required | Notes |
|-------|----------|-------|
| `worker` | yes | Actual name |
| `old_version_id` / `new_version_id` | yes | |
| `percent_new` | yes | |
| `affinity_proven` | for `front-app` | First HTML through assets |
| `bake_minutes` | yes | Declared before step |
| `min_sample` | yes | Declared before step |
| `signals_checked` | yes | Runtime, HTTP 5xx, named latency, asset 404 |
| `decision` | yes | `hold` \| `advance` \| `complete` \| `rollback` |
| `counterpart_worker_state` | yes | Other app’s live version / compatibility note |

### 12.4 Incident closure record

| Field | Required | Notes |
|-------|----------|-------|
| `request_ids_only` | yes | Opaque IDs; no matter/client identifiers |
| `detected_at` / `mitigated_at` | yes | For TTD/TTM against internal objectives |
| `mitigation_type` | yes | `deployment_rollback` \| `hold` \| `flagship_default` \| `forward_fix` |
| `versions_before_after` | yes | Per actual Worker |
| `residual_risk` | yes | Open clients, partial pair, blocked rollback, etc. |
| `follow_ups` | yes | Signal gaps, affinity gaps, contract debt |

---

## 13. Cursor conversation starters

Copy one block into a new agent chat after `@`-attaching the three Stage 1–2 docs (and this guide).

### Implement Stage 1 upload path (docs/process first)

```text
Using the Stage 1–2 CD docs and implementation evidence guide, propose the smallest
Stage 1 upload≠promote design for worker-api and front-app.
Constraints: no Stage 3+; no CI YAML or Wrangler edits until I approve; affected-only
fail-closed; CI upload principal is deployment-capable so promotion needs a broker
CI cannot invoke; classify every Cloudflare claim and reverify via official docs MCP.
Return: work-package checklist mapped to design §E, evidence fields you will collect,
and open blockers.
```

### Reverify one platform claim before coding

```text
Reverify this claim against current Cloudflare docs (Documentation MCP + /index.md):
"<paste claim>".
Classify it, quote the exact limitation, state the operational consequence for our
Stage 1–2 model, and say whether the operating-model/design/evidence docs need an
edit. Do not invent CI or app code.
```

### Design Stage 2 SPA affinity without implementing

```text
Stage 2 is blocked for front-app on workers.dev. Using the evidence guide diagrams and
static-assets gradual-rollouts docs, specify the zone/affinity/override-strip/asset-404
acceptance tests we must pass before a non-zero SPA split. No Wrangler or app patches yet.
```

### Incident / runbook dry-run

```text
Dry-run the design runbooks for: partial promote of front-app while worker-api is fine,
asset 404s during a split, and blocked rollback.
Use mitigation-precedence: deployment first, Flagship only if wired.
Produce the incident-closure schema fields you would fill—no privileged identifiers.
```

### Contract change across both apps

```text
For an additive DTO change in @repo/dtos-common consumed by both apps, walk the
upload, smoke, promote-order, and rollback-pair rules from the operating model and
evidence schemas. Call out what is coordinated vs what is still per-Worker and non-atomic.
```

---

## 14. Agent anti-patterns

Do **not**:

- Treat upload, 0% deployment, Stage 1 100% promote, and Stage 2 non-zero split as interchangeable
- Claim multi-Worker atomic deploy/rollback
- Collapse “100 uploads” and “100 published” selection windows
- Use preview success as proof of zone controls, Logs, or production traffic safety
- Trust overrides without verifying the served version
- Leave untrusted override/affinity headers intact during any two-version deployment
- Put Flagship, browser tokens, or cached bootstrap flags in the SPA critical path for authorization
- Log or key on client/matter identifiers while “debugging CD”
- Write CI YAML / Wrangler / app code from a docs-only request
- Quietly edit decision docs to match an unverified implementation convenience
- Commit empty repo-root files created by accidental Mermaid/tooling side effects — delete them before `git add`

---

## 15. Compact JSON shapes for chat handoff

When an agent must pass structured state to the next turn or to a human, use these shapes (still documentation contracts, not runtime validators).

### Upload / promote handoff

```json
{
  "commit_sha": "",
  "affected_base": "",
  "affected_head": "",
  "affected_packages": [],
  "selected_deployables": ["worker-api", "front-app"],
  "widen_reason": null,
  "workers": [
    {
      "actual_worker_name": "worker-api-production",
      "version_id": "",
      "previous_active_deployment": "",
      "spa_api_origin": null,
      "smoke_method": "protected_preview",
      "served_version_verified": false,
      "decision": "leave_inactive"
    }
  ]
}
```

### Stage 2 step handoff

```json
{
  "actual_worker_name": "front-app-production",
  "old_version_id": "",
  "new_version_id": "",
  "percent_new": 0,
  "affinity_proven": false,
  "bake_minutes": 0,
  "min_sample": 0,
  "signals_ok": {
    "runtime": false,
    "http_5xx": false,
    "named_latency": false,
    "asset_404": false
  },
  "counterpart_note": "",
  "decision": "hold"
}
```

Valid `decision` values for upload/promote: `leave_inactive` | `promote_100` | `abort_restore` | `start_split`.
Valid Stage 2 `decision` values: `hold` | `advance` | `complete` | `rollback`.
