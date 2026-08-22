import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*.{ts,tsx,js,jsx,mjs,cjs}": [
      "pnpm exec oxfmt",
      "pnpm exec oxlint --fix --no-error-on-unmatched-pattern",
    ],
    "*.{json,jsonc,css}": ["pnpm exec oxfmt"],
  },
});
