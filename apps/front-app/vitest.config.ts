import { defineNodeConfig, resolvePackageRoot } from "@repo/vitest-config";
import react from "@vitejs/plugin-react";

// realpath so Vitest VS Code explorer path walks match its workspace cache
// (Fatal Error: Attempted to get parent of root folder "/").
const root = resolvePackageRoot(import.meta.dirname);

export default defineNodeConfig({
  plugins: [react()],
  root,
  test: {
    dir: root,
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: false,
  },
});
