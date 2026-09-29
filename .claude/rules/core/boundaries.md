---
paths:
  - "**/turbo.json"
---

# Package Boundaries

Root `turbo.json` `boundaries.tags` is enforced: `pnpm boundaries` (inside `pnpm run ci`) fails on a violation. This rule is the rationale.

| Tag | Packages | May depend on |
|-----|----------|---------------|
| `app` | every `front-*` / `worker-*` / `queue-*` / `webhook-*` / `mcp-*` | `contracts`, `contracts-base`, `framework`, `lib`, `config` |
| `framework` | `@repo/hono-middleware` | `contracts-base`, `config`, `lib` |
| `contracts` | `@repo/dtos-common` | `contracts-base`, `config` |
| `contracts-base` | `@repo/enums-common` | `config` |
| `lib` | none today | `config` |
| `config` | `@repo/typescript-config`, `@repo/vitest-config` | nothing internal |

- **Nothing depends on an `app`**: `app.dependents.deny` lists every tag, `app` included, so apps are entry points only. Worker-to-Worker calls are service-binding RPC by Worker name ([service-bindings.md](../backend/service-bindings.md)), never a package import - including of another app's `cloudflare.config.ts`, which the cf docs' typed `defineWorker` pattern needs.
- **The contract chain cannot invert**: allow-lists make `enums → dtos` the only direction, so it cannot become a cycle.
- **`framework` is glue only apps consume**: it needs `AppEnvironment` and the CORS header names from `contracts-base`, and its `dependents.deny` keeps a Hono dependency out of `lib` and the contracts chain.
- A new package declares its tag: `turbo.json` with `"extends": ["//"]` and a `tags` entry, or `pnpm boundaries` reports it untagged.
