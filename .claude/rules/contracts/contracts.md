---
paths:
  - "packages/*-common/src/**"
  - "apps/**/src/dtos/**"
  - "apps/**/src/tools/**"
  - "apps/worker-*/src/routes/**"
  - "apps/front-*/src/services/**"
---

# Contract Rules

Zod 4 is the default. The one exception is a framework schema slot that mandates another validator (e.g. Flue's input/output slots take **valibot**) - use its validator only inside that slot and keep the rest of the app on Zod.

## Where a shape lives

A shape has exactly one owner. Its home is the **narrowest scope that still contains every consumer** - define it there once and import it everywhere else; never copy it across a boundary.

- **Does it cross a boundary between two workspaces** (travels over the wire, queue, binding, or is imported by more than one app/package)? → it belongs in `@repo/dtos-common` under the matching layer subdirectory (`api/`, `rpc/`, `queue/`, `webhook/`). See [packages/dtos-common/AGENTS.md](../../packages/dtos-common/AGENTS.md).
- **Is it used inside a single app only** (tool inputs, request/response envelopes, upstream payloads)? → keep it app-local, co-located with that app and exported from the app's own DTO barrel. Do not promote it to the shared package until a second workspace actually needs it.
- **Is it a UI-only view model** that never leaves the front end? → keep it app-local too - but the raw wire payload it is built from must still be validated with the shared schema before you map it into the view model. Local view models describe UI state; they never replace the wire contract.

The test for "shared vs local" is reach, not similarity: two shapes that happen to look alike but never cross the same boundary stay separate; a shape consumed on both sides of a boundary moves up to the shared package.

## Constrained string sets (`@repo/enums-common`)

Same reach test as DTOs, applied to fixed wire-safe string values. Put a value set in `@repo/enums-common` when **any** of these is true:

- more than one app or package uses it;
- it is part of a serialized API contract (a value that travels over the wire);
- it is referenced by a Zod schema that itself lives in the shared DTO package;
- it is shared across concerns that must agree on it (e.g. auth scopes read by both the auth and gateway code).

Keep it app-local when it is used inside a single app only, or is UI-only state with no API meaning. **Default to local; promote on the second consumer.**

Mechanics: one constrained-value set per file, kebab-case filename; re-export up the barrel chain to the package root; when you introduce a new public subpath, add the matching `package.json` export. Define wire-safe values as a `const` object with `as const` plus a derived type (not `export enum` - `erasableSyntaxOnly` is enabled). Reference values from schemas with `z.enum(ValueSet)` for the full `as const` object, or `z.enum([...] as const)` for a subset - never re-type string literals. Import members from the const object, not raw strings or parallel string-literal unions.

## Schema authoring

- **Unknown keys**: pick a policy per file/feature and apply it consistently - if one schema in a file uses `.strict()`, the others should follow the same choice rather than mixing silently.
- **Cross-field rules** go in `.refine()` / `.superRefine()`. Keep the messages safe to return to an API client - no internal paths, stack details, or secret values.
- **Parse mode is a choice about failure handling**: use `.safeParse()` when you want to branch on a structured failure (the norm at trust boundaries here); use `.parse()` only where the throw is caught in a controlled context.

## Discipline

- Prefer additive contract changes. Version or migrate deliberately for breaking request/response shapes, and update every consumer in the same PR.
- Keep schemas lean - see [type-inference.md](type-inference.md) for the full inference policy.
