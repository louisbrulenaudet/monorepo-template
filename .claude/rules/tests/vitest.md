---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/tests/**"
  - "**/vitest.config.ts"
  - "**/vitest.config.mts"
  - "**/vitest.evals.config.ts"
---

# Vitest (general)

Shared factories: `@repo/vitest-config` (Node) and `@repo/vitest-config/workers` (Cloudflare pool). Discipline: [testing.md](../quality/testing.md). Workers + Hono: [hono-workers.md](hono-workers.md). Front React: [front-react.md](front-react.md).

## Repo invariants

- Run via package scripts / turbo (`pnpm turbo run test --filter=<pkg>`). Package scripts use `vitest run`. Agents: non-watch only - never leave interactive watch or `--ui`.
- Turbo caches `test` with no outputs: a cache hit replays the stored log; add `--force` for a fresh execution. Single file: `pnpm --filter=<pkg> exec vitest run tests/<path>.test.ts`. Smoke-running the dev servers is documented under **Verifying a change (agents)** in root `AGENTS.md`.
- Tests under `tests/` mirroring source; kebab-case `*.test.ts`. No Vitest globals - import from `"vitest"`. Never `jest.*`.
- Per-app `vitest.config.ts` / `.mts` via `@repo/vitest-config`. Pin `root` / `test.dir` with `resolvePackageRoot(import.meta.dirname)` for the Vitest VS Code explorer. No root Vitest workspace. Leave `reporters` unset so agent / GHA auto-detection works.
- **Two runtimes:** `worker-*` / `queue-*` / `webhook-*` / `mcp-*` → `@repo/vitest-config/workers`; `front-*` → `@repo/vitest-config` (Node). Never put Workers pool on front or Node pool knobs on Workers.
- **Cloudflare unit vs integration:** Vitest pool (`defineWorkersConfig`) = unit / single-Worker. Wrangler `createTestHarness` = multi-Worker production-build integration only - see root `AGENTS.md` and `packages/vitest-config/AGENTS.md`. Do not replace pool route suites with the harness.
- Meaningful assertions on observable behavior (status, body, headers, binding effects) - reject `toBeDefined()`-only. Prefer real pool bindings on Workers; mock only true I/O on Node.
- Prefer package.json `#/*` imports over inventing `@/` aliases.
