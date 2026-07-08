# @repo/enums-common Agent Instructions

## Overview

**Single source of truth** for shared enum values used across multiple packages and apps. Prevents duplicate string literals in `front-app`, `worker-api`, and `@repo/dtos-common`.

## Structure

```
packages/enums-common/src/
├── <feature>.ts    # One enum per file (kebab-case)
└── index.ts        # Re-exports
```

## When to Add Here vs. Locally

| Criterion | `@repo/enums-common` | App-local |
|-----------|---------------------|-----------|
| Used by more than one app/package | Yes | No |
| Part of serialized API contract | Yes | No |
| Referenced by shared Zod schema | Yes | No |
| UI-only / single-app | No | Yes |

**Default to local; promote on the second consumer.**

## Naming

Per `.claude/rules/naming.md`: enum name `PascalCase`, members `CONSTANT_CASE`, files `kebab-case`. Prefer **string enums** for HTTP/JSON — avoid numeric enums on the wire.

## Breaking Changes

Changing a member's **serialized value** is a breaking contract change.

| Change | Safe? |
|--------|-------|
| Add member | Yes (additive) |
| Rename member identifier | Yes |
| Change member value string | **No** — coordinate DTO + API + UI |
| Remove member | **No** — version API |

Update all consumers in the same PR.

## Zod Integration

In `@repo/dtos-common`:

```typescript
import { ApiHealthStatus } from "@repo/enums-common";

export const HealthResponseSchema = z.object({
  status: z.enum(ApiHealthStatus),
  timestamp: z.string().datetime(),
});
```

## Adding an Enum

1. Create `src/<feature>.ts`.
2. Re-export from `src/index.ts`.
3. Import in consumers in the same PR.
4. `make check-types` from root.

## Commands

| Command | Description |
|---------|-------------|
| `make format` / `make lint` / `make check` | OXC |
| `make check-types` | TypeScript |

## Contribution

Enums only when shared across workspaces. Keep the package thin — definitions only, no business logic. See root [AGENTS.md](../../AGENTS.md).
