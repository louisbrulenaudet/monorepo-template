---
---

Test value gate: an authoring gate and junk-pattern list in the `quality/testing` rule, a human-invoked `/review-tests` audit skill, and two oxlint rules (`vitest/no-restricted-matchers` bans truthiness-only matchers, `vitest/no-identical-title`). The audit passes delete low-value tests, fold near-duplicates into `it.each` tables, tighten weak assertions, and remove test-only production seams: the `isOpaqueCorrelationId` re-export and `getApiHealthDotClassName` in `front-app`, and the `parseCorsOrigins` export in `worker-api`.

No release: no route, response, or rendered output changes; only exports that tests alone imported are gone, and every other change is to tests, lint config, or agent tooling.
