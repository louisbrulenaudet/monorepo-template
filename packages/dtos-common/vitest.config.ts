import { defineNodeConfig, resolvePackageRoot } from "@repo/vitest-config";

// realpath so Vitest VS Code explorer path walks match its workspace cache
// (Fatal Error: Attempted to get parent of root folder "/").
const root = resolvePackageRoot(import.meta.dirname);

// No suite yet: the shared passWithNoTests keeps this green until the first
// test lands under tests/.
export default defineNodeConfig({
  root,
  test: { dir: root },
});
