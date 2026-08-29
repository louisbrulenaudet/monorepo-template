import { defineNodeConfig, resolvePackageRoot } from "@repo/vitest-config";
import react from "@vitejs/plugin-react";

// realpath so Vitest VS Code explorer path walks match its workspace cache
// (Fatal Error: Attempted to get parent of root folder "/").
const root = resolvePackageRoot(import.meta.dirname);

// Plain react() only - the app vite.config.ts must never be merged here (it
// loads cloudflare() and production env asserts); the compiler pass adds
// nothing to tests.
export default defineNodeConfig({
  plugins: [react()],
  root,
  test: {
    dir: root,
    setupFiles: ["./vitest.setup.ts"],
    // Both suites exist: "every test file got filtered away" is a failure
    // here, unlike the shared default that keeps empty packages green.
    passWithNoTests: false,
  },
});
