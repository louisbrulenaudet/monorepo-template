import { defineWorkersConfig } from "@repo/vitest-config/workers";

export default defineWorkersConfig({
  wrangler: { configPath: "./wrangler.jsonc" },
});
