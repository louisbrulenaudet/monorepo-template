import {
  defineWorkersConfig,
  resolvePackageRoot,
} from "@repo/vitest-config/workers";
import path from "node:path";

// realpath so Vitest VS Code explorer path walks match its workspace cache
// (Fatal Error: Attempted to get parent of root folder "/").
const root = resolvePackageRoot(import.meta.dirname);

export default defineWorkersConfig(
  { wrangler: { configPath: path.join(root, "wrangler.jsonc") } },
  { root, test: { dir: root, passWithNoTests: false } },
);
