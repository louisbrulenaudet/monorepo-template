import type { ViteUserConfig } from "vitest/config";
import type { InlineConfig } from "vitest/node";
import { defineConfig, mergeConfig } from "vitest/config";

export { resolvePackageRoot } from "./package-root.js";

const sharedTestDefaults: InlineConfig = {
  include: ["tests/**/*.test.{ts,tsx}"],
  restoreMocks: true,
  clearMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
  passWithNoTests: true,
};

/** Node Vitest config for `front-*` apps. */
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
