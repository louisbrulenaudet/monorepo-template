---
paths:
  - "apps/**/*.{ts,tsx}"
  - "packages/**/*.ts"
  - "apps/*/package.json"
  - "packages/*/package.json"
---

# Naming

Match the casing of the surrounding code; Oxc enforces filename and identifier conventions (`.oxlintrc.json`), so never invent a personal scheme.

- **Filenames** are kebab-case. In `apps/front-*/**` a React component file may be PascalCase to mirror its export (`SomeComponent.tsx`); hooks, utils, and services stay kebab-case.
- **Schemas** end in `Schema` (`…RequestSchema`, `…ResponseSchema`, `…InputSchema`, `…PayloadSchema`, `…MessageSchema`, `…EventSchema`); the inferred type drops `Schema` and never takes a `Type` suffix ([contracts.md](../contracts/contracts.md)).
- **Package names**: `@repo/<purpose>` in kebab-case, with the unscoped name as the directory. The last word stays singular even when the package holds several (`@repo/typescript-config`, `@repo/hono-middleware` - `middleware` is uncountable, never `middlewares`); only a countable noun before `-common` takes a plural (`@repo/dtos-common`, `@repo/enums-common`).
- **Apps are unscoped, and everything under `packages/` is `@repo/`-scoped**: the Changesets `fixed` group is exactly the unscoped workspaces, and nothing machine-checks this ([release.md](../ops/release.md)).
- snake_case only where an external contract requires it (MCP tool `name`, OpenAPI `operationId`); the defining file stays kebab-case.
