import { defineNodeConfig, resolvePackageRoot } from "@repo/vitest-config";

// realpath so Vitest VS Code explorer path walks match its workspace cache
// (Fatal Error: Attempted to get parent of root folder "/").
const root = resolvePackageRoot(import.meta.dirname);

export default defineNodeConfig({
  root,
  test: {
    dir: root,
    // A suite exists: an include-glob mismatch must fail loudly instead of
    // replaying green.
    passWithNoTests: false,
  },
});
