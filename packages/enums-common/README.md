# @repo/enums-common

[![Biome](https://img.shields.io/static/v1?label=lint&message=Biome&color=blue&logo=biome&logoColor=white)](https://biomejs.dev/)
[![TypeScript](https://img.shields.io/static/v1?label=language&message=TypeScript&color=blue&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

This package centralizes enum values that are reused across applications (frontend UI, API validation, and shared mappings) to avoid duplicating string literals.

## Purpose

Provide strongly typed enum values shared across `@repo/*` packages and apps.

## Features

- **Consistent values across the repo** (frontend + worker-api)
- **Type-safe imports** so Zod schemas and UI labels stay compatible

## Tech Stack

- **Language:** TypeScript (strict mode, ESNext)
- **Formatting/Linting:** Biome (spaces, double quotes, recommended rules)
- **Package Manager:** pnpm

## Installation

This package is part of the monorepo and is automatically available to other packages. To use it in a package:

```json
{
  "dependencies": {
    "@repo/enums-common": "workspace:*"
  }
}
```

Then install dependencies:

```bash
pnpm install
```

## Usage

### Importing `Subject`

```typescript
import { Subject } from "@repo/enums-common";

const value: Subject = Subject.GENERAL;
```

### Using enum values in UI validation

```typescript
import { Subject } from "@repo/enums-common";

const allowed = Object.values(Subject);
// Use `allowed` to build dropdown options or validate incoming values
```

## When to add enums here

- Add an enum to `@repo/enums-common` when the value set is shared across **multiple apps/packages** (e.g. UI dropdown + API validation + DTO schemas).
- Keep enums local to an app/package if they are **purely internal** and not part of a shared contract.

## Safe usage notes

- `Object.values(SomeEnum)` is convenient, but its inferred type is `string[]` in many cases. When you need stronger typing, prefer an explicit typed list (or a helper) so your UI options stay type-safe.

## Common Commands

| Command                | Description                                 |
|------------------------|---------------------------------------------|
| `make format`          | Format codebase using Biome                 |
| `make lint`            | Lint codebase using Biome                   |
| `make check`           | Run full Biome check (format + lint)        |
| `make check-types`     | Check TypeScript types                      |
| `make types`           | Generate TypeScript type definitions        |

### Direct pnpm Commands

```bash
pnpm format          # Format with Biome
pnpm lint            # Lint with Biome
pnpm check           # Full Biome check
pnpm check-types     # Check TypeScript types
```

## Project Structure

```
packages/enums-common/
├── src/
│   └── index.ts      # Re-exports enums
├── Makefile             # CLI shortcuts for common tasks
├── make/                # Makefile includes
└── package.json
```

## Best Practices

1. **Never duplicate enum string literals** across apps; always import the enums from this package.
2. **Treat enums as the source of truth** for constrained values used by Zod schemas and UI.
