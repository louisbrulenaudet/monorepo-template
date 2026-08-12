import { defineWorkersConfig } from "@repo/vitest-config/workers";

// Pin root to this package so the Vitest VS Code extension does not walk
// process.cwd()-relative paths up to filesystem root (Fatal Error: Attempted
// to get parent of root folder "/").
export default defineWorkersConfig(
  { wrangler: { configPath: "./wrangler.jsonc" } },
  { root: import.meta.dirname },
);
