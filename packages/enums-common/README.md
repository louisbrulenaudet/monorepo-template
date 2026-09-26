# @repo/enums-common

Shared constrained string values - HTTP methods, CORS headers, app environments - so Zod schemas, Workers, and the SPA agree on the same literals without duplicating them. Each set is an `as const` object with a derived union type, never a TypeScript `enum` (`erasableSyntaxOnly` forbids runtime enum emit). A set belongs here once a second app or a shared DTO uses it; until then it stays in `apps/*/src/enums/`.

## Usage

Define a set in `src/<feature>.ts` and export the value and the type from `src/index.ts`:

```typescript
export const MyValueSet = {
  FOO: "foo",
  BAR: "bar",
} as const;

export type MyValueSet = (typeof MyValueSet)[keyof typeof MyValueSet];
```

Read members, or list them for UI options and allow-lists:

```typescript
import { HttpMethod } from "@repo/enums-common";

const method = HttpMethod.GET;
const allowed = Object.values(HttpMethod);
```

Spread an exported readonly list where an API expects `string[]`, such as Hono CORS:

```typescript
import { CORS_ALLOWED_HEADERS } from "@repo/enums-common";

allowHeaders: [...CORS_ALLOWED_HEADERS],
```

In a `@repo/dtos-common` schema, pass the object for every member, or an `as const` tuple for a subset - a plain `string[]` would widen the inferred type to `string`:

```typescript
import { HttpMethod } from "@repo/enums-common";
import * as z from "zod/mini";

export const HttpMethodSchema = z.enum(HttpMethod);

const writeMethods = [HttpMethod.POST, HttpMethod.PUT] as const;
export const WriteMethodSchema = z.enum(writeMethods);
```

Agent and contributor detail: [AGENTS.md](AGENTS.md).
