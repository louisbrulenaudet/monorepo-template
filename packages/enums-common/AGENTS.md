# @repo/enums-common Agent Instructions

## Overview

**Single source of truth** for shared constrained string values used across multiple packages and apps. Prevents duplicate string literals in `front-app`, `worker-api`, and `@repo/dtos-common`.

Values are defined as **`as const` objects** with a derived type — not TypeScript `enum` (`erasableSyntaxOnly` is enabled repo-wide).

## Structure

```
packages/enums-common/src/
├── <feature>.ts    # One value set per file (kebab-case)
└── index.ts        # Re-exports
```

## Definition pattern

```typescript
export const HttpMethod = {
  GET: "GET",
  POST: "POST",
} as const;

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
```

- **Object name**: `PascalCase` (e.g. `HttpMethod`, `Status`)
- **Members**: `CONSTANT_CASE` keys, string literal values for HTTP/JSON wire formats
- **Never** use `export enum` — use `as const` + derived type only
- **Never** use numeric values on the wire

For typed lists used in APIs or CORS config, prefer an explicit `readonly` array:

```typescript
export const CORS_ALLOWED_HTTP_METHODS: readonly HttpMethod[] = [
  "GET",
  "POST",
];
```

## When to Add Here vs. Locally

| Criterion | `@repo/enums-common` | App-local (`src/enums/`) |
|-----------|---------------------|--------------------------|
| Used by more than one app/package | Yes | No |
| Part of serialized API contract | Yes | No |
| Referenced by shared Zod schema | Yes | No |
| UI-only / single-app | No | Yes |

## Breaking Changes

Changing a member's **serialized string value** is a breaking contract change.

| Change | Safe? |
|--------|-------|
| Add member | Yes (additive) |
| Rename member key (`POST` → `CREATE` key) | Yes if wire value unchanged |
| Change member wire value string | **No** — coordinate DTO + API + UI |
| Remove member | **No** — version API |

Update all consumers in the same PR.

## Zod integration (in `@repo/dtos-common`)

Zod accepts three shapes for `z.enum()` — all require **literal inference** (`as const` on the object or tuple, or an inline literal array):

**Full value set** — pass the `as const` object directly (simplest when the schema allows every member):

```typescript
import { Status } from "@repo/enums-common";
import { z } from "zod";

export const JobStatusSchema = z.enum(Status);
```

Do **not** pass a plain `string[]` variable without `as const` — Zod widens inference to `string` instead of a literal union. Do **not** use TypeScript `enum` with Zod (`z.nativeEnum` is deprecated; repo uses `as const` anyway).

## Adding a value set

1. Create `src/<feature>.ts` with `as const` object + derived type.
2. Re-export from `src/index.ts`.
3. Import in consumers in the same PR.
4. `make check-types` from root.

## Commands

| Command | Description |
|---------|-------------|
| `make format` / `make lint` / `make check` | OXC |
| `make check-types` | TypeScript |

## Contribution

Shared value sets only — keep the package thin (definitions + small helpers, no business logic). See root [AGENTS.md](../../AGENTS.md).
