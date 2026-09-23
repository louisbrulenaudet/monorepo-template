import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*.{ts,tsx,js,jsx,mjs,cjs}": [
      "pnpm exec oxlint --fix --no-error-on-unmatched-pattern",
      "pnpm exec oxfmt",
    ],
    "*.{json,jsonc,css}": ["pnpm exec oxfmt --no-error-on-unmatched-pattern"],
  },
});
