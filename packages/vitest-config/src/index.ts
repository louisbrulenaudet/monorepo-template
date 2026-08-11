import type { ViteUserConfig } from "vitest/config";
import type { InlineConfig } from "vitest/node";
import { defineConfig, mergeConfig } from "vitest/config";

/**
 * Shared Vitest `test` defaults for every app runtime.
 *
 * Do not set `reporters` here: Vitest 4.1 auto-selects the `agent` reporter
 * when `AI_AGENT` / std-env detects an agent, and custom reporters skip that
 * detection. GitHub Actions still gets the built-in `github-actions` job
 * summary when unset.
 */
export const sharedTestDefaults: InlineConfig = {
  include: ["tests/**/*.test.ts"],
  restoreMocks: true,
  clearMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
  passWithNoTests: true,
};

/**
 * Node Vitest config for `front-*` apps.
 *
 * - `pool: "threads"` — faster IPC than default `forks` for compatible Node
 *   suites
 * - `isolate: false` — skip per-file worker isolation when tests clean up mocks
 * - `experimental.fsModuleCache` — persist transform cache across watch/reruns
 *
 * Never attach `cloudflareTest` / the Workers pool here.
 */
export function defineNodeConfig(
  overrides: ViteUserConfig = {},
): ViteUserConfig {
  return mergeConfig(
    defineConfig({
      test: {
        ...sharedTestDefaults,
        environment: "node",
        pool: "threads",
        isolate: false,
        experimental: {
          fsModuleCache: true,
        },
      },
    }),
    defineConfig(overrides),
  );
}
