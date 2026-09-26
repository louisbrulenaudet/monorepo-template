# @repo/correlation-id Agent Instructions

## Overview

**Single source of truth** for opaque UUID v4 correlation helpers used by `worker-api` and `front-app`. Values are sent as `X-Request-Id` (do not rename the header) and must never identify a client or matter (see skill `privileged-legal-data`).

This package is runtime-neutral (Workers + browser + Node). Browser `sessionStorage` persistence stays app-local under `front-app`.

## Structure

```
packages/correlation-id/
├── src/
│   ├── correlation-id.ts    # isOpaqueCorrelationId, resolveCorrelationId
│   └── index.ts     # Named re-exports (prefer explicit export { … } over export *)
├── tests/           # Vitest (Node) - correlation-id.test.ts
│   └── tsconfig.json  # In check-types
├── vitest.config.ts # defineNodeConfig from @repo/vitest-config
└── turbo.json       # tags: ["lib"]
```

## When to Add Here vs. Locally

| Criterion | `@repo/correlation-id` | App-local (`src/utils/`) |
|-----------|------------------------|--------------------------|
| Used by more than one app/package | Yes | No |
| Opaque UUID predicate / mint helper | Yes | No |
| Browser sessionStorage / SPA wrapper | No | Yes |
| Privileged or matter-scoped identifiers | Never | Never |

## Adding a helper

1. Create or extend `src/<feature>.ts` (kebab-case).
2. Named-export from `src/index.ts`.
3. Update consumers in the same PR.
4. Cover the new helper in `tests/` (this package is a security boundary - the opaque-id gate must stay tested).
5. `pnpm check-types` from root.

## Contribution

Keep the package thin (opaque gate + mint/accept only, no business logic). Tests: `pnpm -w turbo run test --filter=@repo/correlation-id`.
