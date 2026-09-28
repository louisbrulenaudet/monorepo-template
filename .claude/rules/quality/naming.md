---
paths:
  - "apps/**/*.{ts,tsx}"
  - "packages/**/*.ts"
  - "apps/*/package.json"
  - "packages/*/package.json"
---

# Naming

Match the casing of the surrounding code. Oxc enforces filename and identifier conventions (`.oxlintrc.json`) - do not invent a personal scheme.

## Repo-specific exceptions

- **Filenames** are kebab-case. Exception in `apps/front-*/**`: a React component file may use PascalCase to mirror its export (`SomeComponent.tsx`); hooks, utils, and services stay kebab-case.
- **DTO schemas** end in `Schema` (or `…RequestSchema` / `…ResponseSchema` / `…InputSchema` / `…PayloadSchema` / `…MessageSchema` / `…EventSchema`). Inferred types drop the `Schema` suffix; never use a `Type` suffix. See [type-inference.md](../contracts/type-inference.md) and [contracts.md](../contracts/contracts.md).
- **Package names**: `@repo/<purpose>` in kebab-case; the directory is the unscoped name. Keep the last word singular even when the package holds several (`@repo/typescript-config`, `@repo/hono-middleware`; `middleware` is uncountable, never `middlewares`). Only a countable noun before `-common` takes a plural (`@repo/dtos-common`, `@repo/enums-common`).
- Snake_case only when an external contract requires it (e.g. MCP tool `name` / OpenAPI `operationId`); the defining file stays kebab-case.
