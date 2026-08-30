import type { ViteUserConfig } from "vitest/config";
import type { InlineConfig } from "vitest/node";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig, mergeConfig } from "vitest/config";

export { resolvePackageRoot } from "./package-root.js";

const sharedTestDefaults: InlineConfig = {
  include: ["tests/**/*.test.ts"],
  restoreMocks: true,
  clearMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
  passWithNoTests: true,
};

type CloudflareTestOptions = Parameters<typeof cloudflareTest>[0];

/** Workers Vitest config via `@cloudflare/vitest-plugin`. */
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
