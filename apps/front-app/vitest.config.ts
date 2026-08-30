import { defineNodeConfig, resolvePackageRoot } from "@repo/vitest-config";
import react from "@vitejs/plugin-react";

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
