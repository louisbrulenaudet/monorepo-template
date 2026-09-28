# @repo/dtos-common

Shared Zod Mini wire contracts - the single source of truth for payload shapes at every boundary. A schema change is a contract change: update every producer and consumer in the same PR, and prefer additive changes (new optional fields, new endpoints) over breaking edits.

One subpath per boundary: `/api` (HTTP, `front-app` to `worker-api`) is exported today, while `/rpc`, `/queue`, and `/webhook` get their directory and `package.json` export with their first schema. Import through a layer subpath - the package has no root entry.

## Usage

Define a schema in `src/api/<feature>.ts`, infer its type rather than hand-writing one, and export both from `src/api/index.ts`:

```typescript
import * as z from "zod/mini";

export const ExampleSchema = z.object({
  id: z.string(),
});

export type Example = z.infer<typeof ExampleSchema>;
```

Parse responses at the boundary in the SPA:

```typescript
import { HealthResponseSchema } from "@repo/dtos-common/api";

const parsed = HealthResponseSchema.safeParse(rawPayload);
if (!parsed.success) {
  // parsed.error carries the Zod issues
}
```

`worker-api` validates route inputs with `zValidator` against the same schemas; [`src/routes/echo.ts`](../../apps/worker-api/src/routes/echo.ts) is the worked example.

Agent and contributor detail: [AGENTS.md](AGENTS.md).
