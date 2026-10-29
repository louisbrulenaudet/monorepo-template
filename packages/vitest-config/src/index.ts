import type { ViteUserConfig } from "vitest/config";
import type { InlineConfig } from "vitest/node";
import { defineConfig, mergeConfig } from "vitest/config";

export { resolvePackageRoot } from "./package-root.js";

const sharedTestDefaults: InlineConfig = {
  include: ["tests/**/*.test.{ts,tsx}"],
  restoreMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
  // Per-app cache: the workspace-root default is wiped by any parallel run that sees a new lockfile hash.
  fsModuleCachePath: "node_modules/.vitest-cache",
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
      },
    }),
    defineConfig(overrides),
  );
}
