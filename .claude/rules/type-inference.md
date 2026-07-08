---
paths:
  - "packages/*-common/src/**"
  - "apps/**/src/dtos/**"
  - "apps/**/src/tools/**"
---

# Type Inference First

Derive TypeScript types from the source of truth. Do not hand-write `interface` / `type` aliases for shapes a Zod schema already defines. See [contracts.md](contracts.md) for where each schema belongs.

## Zod file layout

- Schema exports end in `Schema` / `RequestSchema` / `ResponseSchema` / `InputSchema` / `PayloadSchema`.
- **All** inferred types sit at the **bottom** of the file, after every schema — never interleaved:
  ```ts
  export const ExampleInputSchema = z.object({ /* ... */ });

  export type ExampleInput = z.infer<typeof ExampleInputSchema>;
  ```
- Never use a `Type` suffix on inferred exports (`ExampleInputType` is forbidden).
- Shared enum values live in `@repo/enums-common`, not parallel string-literal unions.

## Keep schemas lean

- Enum values belong in `.enum(...)` (which becomes the JSON-schema `enum`) — do not also spell them out in `.describe()` prose.
- Per-corpus planning guidance goes inline in the tool `description` and input `.describe()` text; there is no separate discovery catalog.

## Do not

- Duplicate HTTP/wire shapes in app-local interfaces.
- Add `types.ts` files or parallel interfaces for shapes Zod or Drizzle already define.
- Use a `Type` suffix on inferred exports (`FooRequestType` is forbidden).
- Hand-write DB row types when a Drizzle table exists.

## Allowed exceptions

- App-local-only types that never cross a package boundary.
- Mapping helpers between inferred types (e.g. output projection).
