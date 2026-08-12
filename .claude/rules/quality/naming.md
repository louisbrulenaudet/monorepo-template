---
paths:
  - "apps/**/*.{ts,tsx}"
  - "packages/**/*.ts"
---

# Naming

Match the casing of the surrounding code. Oxc enforces filename and identifier conventions (`.oxlintrc.json`) - do not invent a personal scheme.

## Repo-specific exceptions

- **Filenames** are kebab-case. Exception in `apps/front-*/**`: a React component file may use PascalCase to mirror its export (`SomeComponent.tsx`); hooks, utils, and services stay kebab-case.
- **DTO schemas** end in `Schema` (or `…RequestSchema` / `…ResponseSchema` / `…InputSchema` / `…PayloadSchema` / `…MessageSchema` / `…EventSchema`). Inferred types drop the `Schema` suffix; never use a `Type` suffix. See [type-inference.md](../contracts/type-inference.md) and [contracts.md](../contracts/contracts.md).
- Snake_case only when an external contract requires it (e.g. MCP tool `name` / OpenAPI `operationId`); the defining file stays kebab-case.
