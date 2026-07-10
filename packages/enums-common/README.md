# @repo/enums-common

[![Oxc](https://img.shields.io/static/v1?label=lint%2Fformat&message=Oxc&color=blue&logo=oxc&logoColor=white)](https://oxc.rs/)
[![TypeScript](https://img.shields.io/static/v1?label=language&message=TypeScript&color=blue&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Shared **constrained string values** reused across apps and packages (HTTP methods, status codes, CORS headers, etc.). Implemented as `as const` objects — not TypeScript `enum`.

## Purpose

Provide strongly typed, wire-safe string literals so Zod schemas, Workers, and the frontend stay in sync without duplicating magic strings.

## Features

- **Consistent values across the repo** (frontend + worker-api + dtos-common)
- **Type-safe imports** via `as const` objects and derived union types
- **Erasable syntax** — compatible with `erasableSyntaxOnly` (no runtime enum emit)

## Tech Stack

- **Language:** TypeScript 7.x (strict, via `@repo/typescript-config/workers-lib.json`)
- **Formatting/Linting:** OXC (oxfmt / oxlint)
- **Package Manager:** pnpm

## Installation

```json
{
  "dependencies": {
    "@repo/enums-common": "workspace:*"
  }
}
```

```bash
pnpm install
```

## Usage

### Import members

```typescript
import { HttpMethod } from "@repo/enums-common";

const method = HttpMethod.GET;
```

### Build UI options or allow-lists

```typescript
import { HttpMethod } from "@repo/enums-common";

const allowed = Object.values(HttpMethod);
```

For APIs expecting `string[]` (e.g. Hono CORS), spread a readonly list:

```typescript
import { CORS_ALLOWED_HEADERS } from "@repo/enums-common";

allowHeaders: [...CORS_ALLOWED_HEADERS],
```

### Use in Zod schemas (`@repo/dtos-common`)

Pass the `as const` object directly when the schema allows every member:

```typescript
import { Status } from "@repo/enums-common";
import { z } from "zod";

export const JobStatusSchema = z.enum(Status);
```

For a **subset**, use a `as const` tuple:

```typescript
const statusValues = [Status.PENDING, Status.FAILED] as const;

export const TerminalStatusSchema = z.enum(statusValues);
```

Avoid passing a plain `string[]` without `as const` — Zod will infer `string` instead of a literal union.

## When to add values here

- Shared across **multiple apps/packages** (e.g. CORS config + fetch client + DTO validation).
- Part of a **serialized contract** on the wire.

Keep value sets **app-local** (`apps/*/src/enums/`) when UI-only or single-consumer.

## Definition template

```typescript
export const MyValueSet = {
  FOO: "foo",
  BAR: "bar",
} as const;

export type MyValueSet = (typeof MyValueSet)[keyof typeof MyValueSet];
```

## Commands

| Command | Description |
|---------|-------------|
| `make format` / `make lint` / `make check` | OXC |
| `make check-types` | TypeScript (`tsc -b`) |

## Project structure

```
packages/enums-common/
├── src/
│   ├── http-method.ts
│   ├── status.ts
│   ├── cors-allowed-header.ts
│   └── index.ts
├── Makefile
└── package.json
```

## Best practices

1. **Never duplicate wire literals** — import from this package or promote here on second use.
2. **Use `as const` objects**, not `export enum`.
3. **String values only** on HTTP/JSON boundaries — no numeric enums.
4. **Explicit `readonly` arrays** for exported lists when `isolatedDeclarations`-style clarity helps (e.g. CORS allow-lists).

Agent-focused notes: [AGENTS.md](AGENTS.md).
