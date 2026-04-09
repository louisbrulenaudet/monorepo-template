# @repo/enums-common Agent Instructions

## Project Overview

`@repo/enums-common` is the **single source of truth** for shared enum values and constants used across multiple packages and apps in the monorepo. It prevents duplication of string literals across `front-app`, `worker-api`, and `@repo/dtos-common`.

## Project Structure

```
packages/enums-common/
├── src/
│   ├── status.ts        # Status-related enums (e.g. ApiHealthStatus)
│   └── index.ts         # Re-exports all shared enums
├── tsconfig.json        # Extends @repo/typescript-config/workers-lib.json
├── biome.json
├── Makefile
└── package.json
```

### Where to Change Things

| Task | Location |
|------|---------|
| Add a new shared enum | New file `src/<feature>.ts`, re-export from `src/index.ts` |
| Add a member to existing enum | Edit the relevant `src/<feature>.ts` file |
| Add an app-local enum | Inside the app (`apps/<app>/src/enums/`) — do not add here |

## When to Add Enums Here vs. Locally

| Criterion | Add to `@repo/enums-common` | Keep in the app |
|-----------|---------------------------|-----------------|
| Used by more than one app or package | Yes | No |
| Part of an HTTP API contract (serialized) | Yes | No |
| Used in a Zod schema shared via `@repo/dtos-common` | Yes | No |
| Used only inside a single app | No | Yes |
| UI-only state with no API meaning | No | Yes |

**Default**: if in doubt, start local. Promote to `@repo/enums-common` when a second consumer needs it.

## Naming Conventions (Required)

Per the root [`AGENTS.md`](../../AGENTS.md):

| Kind | Convention | Example |
|------|-----------|---------|
| Enum name | `PascalCase` | `ApiHealthStatus`, `ContentEncoding` |
| Enum member | `CONSTANT_CASE` | `ApiHealthStatus.HEALTHY`, `ContentEncoding.GZIP` |
| File name | `kebab-case` | `api-health-status.ts`, `content-encoding.ts` |

```typescript
// ✅ Correct
export enum ApiHealthStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
}

// ❌ Incorrect — name should be PascalCase, members CONSTANT_CASE
export enum apiHealthStatus {
  healthy = "healthy",
}
```

## String vs Numeric Enums

- **Always prefer string enums** for values that cross the HTTP boundary or are serialized to JSON. String values are self-documenting and stable across refactors.
- **Avoid numeric enums** for API payloads — their serialized form is an opaque number and breaks if the enum order changes.
- **`const enum`** inlines values at compile time and may cause issues across package boundaries; avoid unless there is a clear performance reason.

```typescript
// ✅ String enum — safe for HTTP serialization
export enum ProcessingStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ❌ Numeric enum — fragile for HTTP APIs
export enum ProcessingStatus {
  PENDING,   // 0
  RUNNING,   // 1 — breaks if order changes
}
```

## Safe Usage Patterns

### `Object.values()` and Strict Typing

`Object.values(SomeEnum)` is inferred as `string[]`, losing literal types. For stricter typing:

```typescript
// Option A: explicit tuple
const HEALTH_STATUSES = [
  ApiHealthStatus.HEALTHY,
  ApiHealthStatus.DEGRADED,
  ApiHealthStatus.UNHEALTHY,
] as const;
type HealthStatusTuple = typeof HEALTH_STATUSES; // readonly ["healthy", "degraded", "unhealthy"]

// Option B: helper that preserves literals
function enumValues<T extends Record<string, string>>(e: T): T[keyof T][] {
  return Object.values(e) as T[keyof T][];
}
```

### Zod Integration

Use `z.enum()` to validate enum values at the API boundary in `@repo/dtos-common`:

```typescript
import { z } from "zod";
import { ApiHealthStatus } from "@repo/enums-common";

export const HealthResponseSchema = z.object({
  status: z.enum(ApiHealthStatus),
  timestamp: z.string().datetime(),
});
```

## Breaking Change Rules

Changing an existing enum **member value** (the string on the right-hand side) is a **breaking API contract change** — any system that has serialized, stored, or transmitted the old value will break.

| Change type | Safe? | Action required |
|-------------|-------|----------------|
| Add a new member | Yes (additive) | Update Zod schemas and UI if exhaustive |
| Rename a member (identifier only) | Yes | Transparent to consumers |
| Change a member's value (`"foo"` → `"bar"`) | **No** | Coordinate DTO + API + frontend migration |
| Remove a member | **No** | Version the API; migrate consumers |

Always update all consumers (`dtos-common`, `worker-api`, `front-app`) in the same PR when changing shared values.

## Adding a New Enum (Workflow)

1. Create `src/<feature>.ts` with the enum definition.
2. Re-export from `src/index.ts`.
3. Run `make install` from the repo root if adding a new file changes the package's exports shape.
4. Import in consumers (`@repo/dtos-common`, `worker-api`, `front-app`) in the same PR.
5. Run `make check-types` from root to confirm no regressions.

## Common Commands

From `packages/enums-common`:

| Command | Description |
|---------|-------------|
| `make format` | Format with Biome |
| `make lint` | Lint with Biome |
| `make check` | Full Biome check |
| `make check-types` | TypeScript typecheck |
| `make types` | Generate Wrangler types (if applicable) |

## Best Practices

- **Never duplicate** a string literal that exists here — import the enum instead.
- **Prefer additive changes** (new members) over renaming or removing existing ones.
- **Coordinate changes** with all consumers in the same PR; never silently break a serialized value.
- **Keep this package thin**: enum definitions and small related helpers only — no business logic, no HTTP calls.

## Official Documentation

- [TypeScript Enums](https://www.typescriptlang.org/docs/handbook/enums.html)
- [Zod `nativeEnum`](https://zod.dev/?id=enums)

## Contribution

- Add enums here only when **shared across more than one app or package**. Keep app-specific values in the app.
- When changing enum style conventions here, keep them consistent with the [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/enums.html) and `@repo/dtos-common` usage.
- Follow the root [`AGENTS.md`](../../AGENTS.md) for naming conventions.
