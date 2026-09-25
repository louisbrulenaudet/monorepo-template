import {
  defineWorkersConfig,
  resolvePackageRoot,
} from "@repo/vitest-config/workers";
import path from "node:path";

const root = resolvePackageRoot(import.meta.dirname);

export default defineWorkersConfig(
  {
    wrangler: { configPath: path.join(root, "wrangler.jsonc") },
    // Empty DSN keeps the Sentry SDK disabled under test.
    miniflare: { bindings: { SENTRY_DSN: "" } },
  },
  { root, test: { dir: root, passWithNoTests: false } },
);
