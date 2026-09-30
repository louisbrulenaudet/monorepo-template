import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [cloudflare({ inspectorPort: 0 })],
  envDir: process.env["SKIP_ENV_FILES"] ? false : ".",
  environments: {
    ssr: {
      build: { minify: true, sourcemap: true },
    },
  },
  server: {
    port: 8700,
    strictPort: true,
  },
});
