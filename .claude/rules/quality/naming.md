---
paths:
  - "apps/**/*.{ts,tsx}"
  - "packages/**/*.ts"
---

# Naming

Match the casing of the surrounding code. The conventions below are enforced by Oxc, so a new name should look like the names already around it.

## Filenames (enforced by `unicorn/filename-case`)

- **kebab-case**: all-lowercase words joined by hyphens (`some-module.ts`). Never PascalCase, camelCase, or snake_case in a filename.
- **Exception - `apps/front-*/**`**: a React component file may use PascalCase to mirror the component it exports (`SomeComponent.tsx`); every non-component file (hooks, utils, services) stays kebab-case.

## Code identifiers

| Kind                  | Convention                                 | Example (illustrative)     |
| --------------------- | ------------------------------------------ | -------------------------- |
| Variables / functions | `camelCase`                                | `doSomething()`            |
| Classes / types       | `PascalCase`                               | `SomeClass`, `SomeInput`   |
| Constants             | `CONSTANT_CASE`                            | `MAX_SOMETHING`            |
| Constrained string sets | `PascalCase` name, `CONSTANT_CASE` members | `SomeEnum.SOME_MEMBER` via `as const` object |

## Snake_case is the exception, not the norm

The only place snake_case appears is an identifier that must match an external contract - e.g. an MCP tool's `name` / OpenAPI `operationId`, which is snake_case even though the file that defines it stays kebab-case. Do not introduce snake_case anywhere else.

## DTOs

- Schema exports end in `Schema` (or a `…RequestSchema` / `…ResponseSchema` / `…InputSchema` / `…PayloadSchema` / `…MessageSchema` / `…EventSchema` variant).
- Inferred types drop the `Schema` suffix; never use a `Type` suffix. See [type-inference.md](../contracts/type-inference.md) and [contracts.md](../contracts/contracts.md).
