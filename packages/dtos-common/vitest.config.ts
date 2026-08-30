import { defineNodeConfig, resolvePackageRoot } from "@repo/vitest-config";

const root = resolvePackageRoot(import.meta.dirname);

export default defineNodeConfig({
  root,
  test: { dir: root },
});
