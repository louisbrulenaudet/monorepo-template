# Stage 1–2 CD Implementation Evidence

> Agent-facing evidence pack for implementing [cd-operating-model.md](./cd-operating-model.md) and [cd-stage1-2-design.md](./cd-stage1-2-design.md). This is not a third decision document: the architectural assessment and operating model remain authoritative.

**Scope:** Stage 1 version delivery and Stage 2 manual progressive exposure for `worker-api` and `front-app` only. No CI YAML, Wrangler configuration, or application implementation is prescribed here.

**Last evidence review:** 2026-08-08. Cloudflare behavior changes; reverify every platform claim immediately before implementation. During the original review, Context7 was quota-blocked, so no conclusion depends on Context7 output. Official Cloudflare Documentation MCP results and direct official pages were used.

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
- Transform Rules require a route on a controlled zone and are unavailable on `workers.dev`. The current `front-app` posture therefore blocks Stage 2. Source: [Choose a version key](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/#choose-a-version-key).
- The affinity header contributes to Workers cache partitioning. Use a dedicated random rollout value—never an auth token, user/client/matter identifier, filename, or privileged value. Source: [Workers cache keys](https://developers.cloudflare.com/workers/cache/cache-keys/).

### Preview URLs and version overrides

- Enabled preview URLs are public unless Cloudflare Access protects them. A production-bound preview is a production exposure surface. Source: [Manage preview access](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/#manage-access-to-preview-urls).
- Preview URLs have no Workers Logs, `wrangler tail`, or Logpush and do not exercise zone-level controls. Preview smoke proves boot/shell only. Source: [Preview limitations](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/#limitations).
- `preview_urls` defaults to `workers_dev`; current documented behavior enables both when neither is configured. Omission is not a deny. Source: [Preview toggle](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/#toggle-preview-urls-enable-or-disable).
- An override applies only when its version is in the current two-version deployment; a new version may be assigned 0%. A 0% smoke is a deployment mutation, not upload. Source: [Override smoke](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/#smoke-test-example).
- Invalid, unavailable, or not-yet-propagated overrides fall back to percentage routing; recent changes can take up to a couple of seconds to become globally available. The smoke runner must verify the served version and fail closed. Source: [Verify overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/#verify-that-version-overrides-were-applied).
- External requests can supply the override header. Derived control: block/remove untrusted overrides throughout every two-version deployment, or a caller with a version ID can bypass percentage containment. Source: [Version overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/).

### Rollback

- Rollback creates a new single-version deployment at 100%; from a split it replaces both versions. Verify the active deployment before declaring mitigation. Source: [Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
- Connected resources and stored data are not rewound. Never describe rollback as restoring storage, secret contents, triggers, routes, DNS, or external configuration. Source: [Rollback bindings](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/#bindings).
- Missing resource targets and Durable Object lifecycle changes can block rollback. The runbook needs a compatible forward-fix path.
- Deployments are per Worker; no official multi-Worker transaction was found. `worker-api` and `front-app` promotion/rollback are ordered and independently verified.

### Observability

- Invocation errors are runtime outcomes, not HTTP status codes. A successful invocation can return application 5xx. Stage 2 needs both signals. Source: [Invocation statuses](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/#invocation-statuses).
- Wall time includes I/O and `waitUntil`; it is not final-byte response latency. Name every performance signal by what it measures. Source: [Metrics and analytics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/).
- Sampled/aggregated quantiles and recent-minute lag require a declared bake and sample count. Delayed or insufficient evidence means hold.
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

## 4. Implementation order and acceptance evidence

### Stage 1

1. **Inventory/bootstrap:** confirm actual Worker names, previous publication, routes/domains, and active deployments. Evidence: names, current version/deployment, bootstrap status.
2. **Credential/authority boundary:** Cloudflare documents generic `Workers Scripts Write`, not upload-only authorization. Treat CI as deployment-capable until a narrower permission is verified. Evidence: principal inventory, dated permission source, approval/broker path CI cannot invoke, revocation owner, audit source—never token values.
3. **Affected selection:** record base/head and fail closed on an unresolved comparison. Explicit widening to both apps is safe; silent narrowing is not. Evidence: SHAs, affected packages, selected deployables, build result, widening reason.
4. **Immutable release record:** record commit, actual Worker, version ID/tag, build inputs, SPA API origin, and previous deployment. Exclude credentials, preview bearer values, client/matter IDs, and privileged content.
5. **Protected smoke:** use Access-protected preview for boot/shell, or trusted 0%-override smoke for zone behavior. Block untrusted overrides throughout the two-version deployment and verify the served version. Evidence: method, version, synthetic probes, result, and restoration after abort.
6. **Manual promote/rollback drill:** re-read active state before mutation; one operator and one in-flight change per Worker. Evidence: before/after deployments, authority, probes, TTD/TTM, compatible rollback target, and external state not restored.
7. **Contract gate:** for shared wire changes, prove old/new producer-consumer combinations. Additive API support reaches 100% before the dependent SPA. Removal waits for measured open-client retirement.

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
   - Version/create-deployment API permissions and `Workers Scripts Write`.
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

## 7. Implementation blockers

1. Named deployable owner/on-call rota for both apps.
2. Named contract owner for shared DTOs/enums.
3. Verified remote names, active deployments, routes/domains, preview status, and Access policy.
4. Promotion authority CI cannot invoke, or explicit acceptance/monitoring of CI deployment authority.
5. Contract compatibility evidence for shared wire changes.
6. Protected smoke with served-version verification and override-header control.
7. Zone route/custom domain plus first-request SPA affinity.
8. Version-attributed runtime, HTTP, performance, and asset-404 signals.
9. End-to-end opaque request correlation.
10. Ramp bake/sample/advance/rollback thresholds and incident owner.
11. Client-retirement measurement before API contract removal.
12. Flagship beta/fallback acceptance, bounded SPA bootstrap freshness, and server-side enforcement if it becomes load-bearing.

A planned implementation is not completion. Stage exit criteria remain unchecked until evidence is real.

---

## 8. Official source index

- [Versions & deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [Deployment management](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/)
- [Gradual deployments](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/)
- [Version affinity](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/version-affinity/)
- [Version overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/)
- [Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/)
- [Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [Workers metrics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/)
- [Version metadata](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/)
- [Workers cache keys](https://developers.cloudflare.com/workers/cache/cache-keys/)
- [API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [Flagship](https://developers.cloudflare.com/flagship/)
- [Flagship concepts](https://developers.cloudflare.com/flagship/concepts/)
- [Flagship binding methods](https://developers.cloudflare.com/flagship/binding/methods/)
- [Flagship percentage rollouts](https://developers.cloudflare.com/flagship/targeting/percentage-rollouts/)
- [Flagship client provider](https://developers.cloudflare.com/flagship/sdk/client-provider/)
- [Flagship public beta](https://developers.cloudflare.com/changelog/post/2026-05-26-public-beta/)
