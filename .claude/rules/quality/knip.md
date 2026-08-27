---
paths:
  - "knip.jsonc"
  - ".github/workflows/ci.yml"
---

# Knip Configuration & Policy

Root `knip.jsonc` is intentionally comment-free; every override's rationale lives here. Official docs: [configuration](https://knip.dev/reference/configuration), [production mode](https://knip.dev/features/production-mode), [configuring project files](https://knip.dev/guides/configuring-project-files).

## Root options

| Option | Why |
|--------|-----|
| `includeEntryExports: true` | Every workspace is `"private": true`, so entry/barrel files (`packages/*/src/index.ts`) get full unused-export auditing |
| `treatConfigHintsAsErrors: true` | Stale or redundant overrides (e.g. an `entry` a plugin now provides) fail the gate instead of rotting silently |

## Workspace overrides

### apps/front-app

- `ignoreDependencies` entries are suffixed `!` = **production mode only**:
  - `@tanstack/*-devtools` - imported by `AppDevtools.tsx`, which is lazy-loaded behind `import.meta.env.DEV`; production builds never statically include them, but Knip's static graph cannot evaluate that conditional.
  - `tailwindcss` - build-time dependency consumed through `@tailwindcss/vite` + the `@import "tailwindcss"` in `src/index.css`.
- `project` replicates the default glob plus a production-only negation (`"!tests/helpers/**!"`) so test helpers like `tests/helpers/session-storage-mock.ts` are never flagged as unused shipped code. Do not use `ignore` or `ignoreFiles` for this - `ignoreFiles` rejects the production-only `!` suffix here.

### apps/worker-api

- `ignoreDependencies: ["cloudflare"]` - `import ... from "cloudflare:workers"` in Workers-pool tests is a runtime protocol specifier resolving to no npm package.

### Root (`"."`)

- `ignoreDependencies: ["@vitest/ui"]` (both passes) - launched as a CLI by the Vite DevTools Vitest dock, never imported, and the root has no Vitest config for Knip's vitest plugin to bind to. It lives at the workspace root rather than in `apps/front-app` because `@vitejs/devtools-vitest` probes for it with `isPackageExists("@vitest/ui", { paths: [workspaceRoot] })` while `@vitejs/devtools` core probes integrations against the app `cwd`; under pnpm's isolated layout an app-local install is invisible to that probe and the dock fails with `VTDT0001`. Do not move it back.

### packages/vitest-config

- `ignoreFiles: ["src/package-root.d.ts"]` - sidecar type declarations for `package-root.js`; unlike `ignore`, the file stays analyzed for exports/types/unresolved issues.
- Root `ignoreWorkspaces: ["packages/vitest-config!"]` (production mode only) - build/test-time config helper, never part of a shipped bundle.

## Policy

- Both passes must stay green: `pnpm knip` (default) and `pnpm knip:production` (`--production --strict`: shipped-code-only + workspace isolation). Both run inside `pnpm run ci`.
- Never blanket-`ignore`. Prefer scoped patterns (`ignoreIssues`, `ignoreFiles`, production-only suffixes like `"dep!"` / `"!pattern!"`).
- Exports kept solely for unit tests carry an explicit JSDoc `@internal` tag - production mode ignores tagged exports, so tests never mask dead shipped API.
- Auto-fix unused dependencies and pnpm catalog entries with `knip --fix --fix-type dependencies,catalog`; agent-readable output via `pnpm knip:agent` (`--reporter symbols`).
- Generated files (`routeTree.gen.ts`, `worker-configuration.d.ts`) resolve cleanly today; if they ever false-positive, use `ignoreIssues` scoped patterns, not blanket `ignore`.
