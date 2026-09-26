# @repo/vitest-config

Shared Vitest configuration factories, so every app gets the same mock hygiene (`restoreMocks`, `clearMocks`, `unstubEnvs`, `unstubGlobals`) and `tests/` layout without copying them. Two entry points keep the runtimes apart: `front-*` apps import `@repo/vitest-config` (`defineNodeConfig`), and Worker-family apps import `@repo/vitest-config/workers` (`defineWorkersConfig`, which wraps the Cloudflare Workers pool), so a Node app never resolves `@cloudflare/vitest-plugin`.

## Usage

A `front-*` SPA:

```ts
// vitest.config.ts
import { defineNodeConfig, resolvePackageRoot } from "@repo/vitest-config";

const root = resolvePackageRoot(import.meta.dirname);

export default defineNodeConfig({
  root,
  test: { dir: root },
});
```

A `worker-*`, `queue-*`, `webhook-*`, or `mcp-*` app, whose tests run inside workerd:

```ts
// vitest.config.mts
import path from "node:path";
import { defineWorkersConfig, resolvePackageRoot } from "@repo/vitest-config/workers";

const root = resolvePackageRoot(import.meta.dirname);

export default defineWorkersConfig(
  { wrangler: { configPath: path.join(root, "wrangler.jsonc") } },
  { root, test: { dir: root } },
);
```

Worker apps also add `@cloudflare/vitest-plugin` as a devDependency, and take `vitest` from the `vitest4` catalog until that plugin supports Vitest 5 (see `pnpm-workspace.yaml`).

Pin `root` and `test.dir` with `resolvePackageRoot(import.meta.dirname)` in every app config: the Vitest VS Code explorer caches the realpath of the workspace folder, and a non-realpathed path (notably through a macOS symlink) fails with `Fatal Error: Attempted to get parent of root folder "/"`.

Each app's `test` script is `vitest run` (CI, agents, and the Turbo cache) and `test:watch` is `vitest`, for humans. Run them with `pnpm test` / `pnpm test:watch` from the root, or scope with `pnpm turbo run test --filter=<app>`.

The Workers pool is the unit-test layer. Multi-Worker integration against production builds uses Wrangler's `createTestHarness()` once a second Worker is bound, following the checklist in `AGENTS.md`.

Agent and contributor detail: [AGENTS.md](AGENTS.md).
