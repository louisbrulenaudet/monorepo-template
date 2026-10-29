import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}": [
      "pnpm exec oxlint --fix --no-error-on-unmatched-pattern",
      "pnpm exec oxfmt --no-error-on-unmatched-pattern",
    ],
    "*.{json,jsonc,css,md,html}": [
      "pnpm exec oxfmt --no-error-on-unmatched-pattern",
    ],
  },
});
