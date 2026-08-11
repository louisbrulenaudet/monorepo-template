import type { ViteUserConfig } from "vitest/config";
import type { InlineConfig } from "vitest/node";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig, mergeConfig } from "vitest/config";

/**
 * Shared defaults duplicated here so `@repo/vitest-config/workers` does not
 * import the Node entry (and Node apps never resolve the Cloudflare pool).
 */
const sharedTestDefaults: InlineConfig = {
  include: ["tests/**/*.test.ts"],
  restoreMocks: true,
  clearMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
  passWithNoTests: true,
};

type CloudflareTestOptions = Parameters<typeof cloudflareTest>[0];

/**
 * Workers Vitest config via `@cloudflare/vitest-pool-workers`.
 *
 * Import from `@repo/vitest-config/workers` so Node-only apps never resolve the
 * Cloudflare pool package.
 *
 * Never set `isolate: false`, a Node `pool`, or a custom `environment`/`runner`
 * — storage isolation is per file by default, and Cloudflare forbids custom
 * envs.
 */
export function defineWorkersConfig(
  cloudflareOptions: CloudflareTestOptions,
  overrides: ViteUserConfig = {},
): ViteUserConfig {
  return mergeConfig(
    defineConfig({
      plugins: [cloudflareTest(cloudflareOptions)],
      test: {
        ...sharedTestDefaults,
      },
    }),
    defineConfig(overrides),
  );
}
