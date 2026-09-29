# @repo/enums-common Agent Instructions

## Overview

**Single source of truth** for constrained string values shared across apps and packages, preventing duplicate literals in `front-app`, `worker-api`, and `@repo/dtos-common`. When a value set belongs here vs locally, the `as const` pattern, `z.enum` integration, and wire-value breaking changes: rule `contracts/contracts` (loads with `src/**`). Keep the package thin: definitions and small helpers, no business logic.

## Structure

```
packages/enums-common/src/
├── <feature>.ts    # One value set per file (kebab-case)
└── index.ts        # Named re-exports (prefer explicit export { … } over export *)
```

## Adding a value set

1. Create `src/<feature>.ts` with the `as const` object + derived type.
2. Named-export value and type from `src/index.ts`, **with the `.ts` extension** on the relative path (`from "./app-environment.ts"`): `cloudflare.config.ts` imports this package (type-only), and Node loads it natively without adding extensions (rule `backend/workers-config`).
3. Import in consumers in the same PR.
4. `pnpm check-types` from the root.
