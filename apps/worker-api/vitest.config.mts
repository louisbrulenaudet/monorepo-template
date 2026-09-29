import {
  defineWorkersConfig,
  resolvePackageRoot,
} from "@repo/vitest-config/workers";

const root = resolvePackageRoot(import.meta.dirname);

export default defineWorkersConfig(
  { experimental: { newConfig: true } },
  { root, test: { dir: root } },
);
