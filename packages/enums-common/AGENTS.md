# @repo/enums-common Agent Instructions

## Overview

**Single source of truth** for shared constrained string values used across multiple packages and apps. Prevents duplicate string literals in `front-app`, `worker-api`, and `@repo/dtos-common`.

Values are **`as const` objects** with a derived type - not TypeScript `enum` (`erasableSyntaxOnly`). Definition pattern, Zod `z.enum` integration, and wire-value breaking-change rules load from `.claude/rules/contracts/` or `.cursor/rules/contracts/` (and [naming](../../.cursor/rules/quality/naming.mdc)) when editing shared value sets.

## Structure

```
packages/enums-common/src/
├── <feature>.ts    # One value set per file (kebab-case)
└── index.ts        # Re-exports
```

## When to Add Here vs. Locally

| Criterion | `@repo/enums-common` | App-local (`src/enums/`) |
|-----------|---------------------|--------------------------|
| Used by more than one app/package | Yes | No |
| Part of serialized API contract | Yes | No |
| Referenced by shared Zod schema | Yes | No |
| UI-only / single-app | No | Yes |

Changing a member's **serialized string value** is a breaking contract change - see `contracts/contracts` (enum wire-value table).

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

Shared value sets only - keep the package thin (definitions + small helpers, no business logic). See root [AGENTS.md](../../AGENTS.md).
