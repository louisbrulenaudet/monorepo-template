# @repo/dtos-common

[![Biome](https://img.shields.io/static/v1?label=lint&message=Biome&color=blue&logo=biome&logoColor=white)](https://biomejs.dev/)
[![TypeScript](https://img.shields.io/static/v1?label=language&message=TypeScript&color=blue&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zod](https://img.shields.io/static/v1?label=validation&message=Zod&color=blue&logo=zod&logoColor=white)](https://github.com/colinhacks/zod)

Shared data transfer objects (DTOs) and validation schemas for the monorepo.

This package is the single source of truth for the data transfer objects and validation schemas used by:

- `apps/front-app` (frontend form validation)
- `apps/worker-api` (API request validation)

## Purpose

Provide type-safe DTO schemas backed by Zod so all apps validate the same payload shape.

This is the “contract” layer of the repo: schema changes happen here first, and apps/workers consume those schemas to stay aligned.

## Tech Stack

- **Language:** TypeScript (strict mode, ESNext)
- **Validation:** Zod
- **Formatting/Linting:** Biome (spaces, double quotes, recommended rules)
- **Package Manager:** pnpm

## Installation

This package is part of the monorepo and is automatically available to other packages. To use it in a package:

```json
{
  "dependencies": {
    "@repo/dtos-common": "workspace:*"
  }
}
```

Then install dependencies:

```bash
pnpm install
```

## Usage

### Frontend (React)

Validate the form payload before calling the API using the shared validation schemas:

```typescript
import { HealthResponseSchema } from "@repo/dtos-common/api";

const parsed = HealthResponseSchema.safeParse(rawPayload);
if (!parsed.success) {
  // parsed.error contains Zod issues
}

// parsed.data is now correctly typed
```

### Worker API (Hono)

Validate requests at the route boundary using `@hono/zod-validator`:

```typescript
import { zValidator } from "@hono/zod-validator";
import { SomeRequestSchema } from "@repo/dtos-common/api";

app.post("/some-endpoint", zValidator("json", SomeRequestSchema), async (c) => {
  const data = c.req.valid("json"); // fully typed + validated

  return c.json({ ok: true, received: data });
});
```

For responses, you can also validate at the boundary before returning:

```typescript
import { HealthResponseSchema } from "@repo/dtos-common/api";

const response = HealthResponseSchema.parse({ status: "ok" });
return c.json(response);
```

## Common Commands

| Command                | Description                                 |
|------------------------|---------------------------------------------|
| `make format`          | Format codebase using Biome                 |
| `make lint`            | Lint codebase using Biome                   |
| `make check`           | Run full Biome check (format + lint)        |
| `make check-types`     | Check TypeScript types                      |

### Direct pnpm Commands

```bash
pnpm format          # Format with Biome
pnpm lint            # Lint with Biome
pnpm check           # Full Biome check
pnpm check-types     # Check TypeScript types
```

## Project Structure

```
packages/dtos-common/
├── src/
│   ├── api/
│   │   ├── health.ts     # Health check response schema
│   │   └── index.ts
│   └── index.ts
├── Makefile
├── make/
└── package.json
```

## Best Practices

1. **Use DTOs from this package** instead of re-implementing Zod schemas in apps.
2. **Treat Zod schemas as source of truth** (DTO changes should be reflected everywhere).
3. **Avoid duplicating subject labels** in the frontend: use `getSubjectLabel`.

### Compatibility / versioning

- Prefer **additive changes** (new optional fields, new endpoints) to avoid breaking existing consumers.
- When you need a breaking contract change, introduce it under a new route/version on the API side (e.g. a new path under `/api/v1/...` or a new version) and migrate consumers deliberately.
