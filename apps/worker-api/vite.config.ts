import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [cloudflare({ inspectorPort: 0 })],
  define: { __SENTRY_DEBUG__: false },
  envDir: process.env["SKIP_ENV_FILES"] ? false : ".",
  environments: {
    ssr: {
      build: { minify: true },
    },
  },
  server: {
    port: 8700,
    strictPort: true,
  },
});
