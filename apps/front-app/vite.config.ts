// apps/front-app/vite.config.ts

import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), cloudflare()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@enums": path.resolve(__dirname, "./src/enums"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@ui": path.resolve(__dirname, "./src/components/ui"),
      "@routes": path.resolve(__dirname, "./src/routes"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@config": path.resolve(__dirname, "./src/config"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@dtos": path.resolve(__dirname, "./src/dtos"),
    },
  },

  css: {
    devSourcemap: true,
  },

  build: {
    target: "esnext",
    minify: "oxc",
    sourcemap: mode === "development" ? "inline" : "hidden",
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    modulePreload: {
      polyfill: false,
    },
    rolldownOptions: {
      output: {
        manualChunks(id) {
          // Keep internal workspace packages split out once they grow.
          if (id.includes("/packages/dtos-common/")) {
            return "repo-dtos-common";
          }

          if (!id.includes("node_modules")) {
            return;
          }
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/")
          ) {
            return "react-vendor";
          }

          return "vendor";
        },
      },
    },
  },

  server: {
    host: true,
    port: 5174,
    strictPort: true,
    hmr: {
      overlay: true,
    },
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/App.tsx"],
    },
    fs: {
      allow: [repoRoot],
      strict: true,
    },
  },

  preview: {
    port: 4174,
    strictPort: true,
  },

  optimizeDeps: {
    entries: ["index.html", "src/main.tsx"],
    include: ["react", "react-dom"],
  },
}));
