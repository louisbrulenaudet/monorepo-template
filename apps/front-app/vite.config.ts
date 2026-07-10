// apps/front-app/vite.config.ts

import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv, type PluginOption } from "vite";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const analyzeBundle = process.env["ANALYZE"] === "true";
const repoRoot = path.resolve(appDir, "../..");
const productionEnvKeys = ["VITE_API_BASE_URL"] as const;

function isPlaceholderOrigin(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return (
      hostname.endsWith(".example.com") || hostname.endsWith(".your-domain.com")
    );
  } catch {
    return true;
  }
}

function assertProductionOriginEnv(mode: string, command: string): void {
  const isStaticAnalysis = process.argv.some((arg) => arg.includes("knip"));
  if (isStaticAnalysis || command !== "build" || mode !== "production") {
    return;
  }

  const env = loadEnv(mode, appDir, "VITE_");
  const missing = productionEnvKeys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing production frontend env: ${missing.join(", ")}. ` +
        "Set them in apps/front-app/.env.production or the deploy environment.",
    );
  }

  const placeholders = productionEnvKeys.filter((key) =>
    env[key] ? isPlaceholderOrigin(env[key]) : false,
  );
  if (placeholders.length > 0) {
    throw new Error(
      `Production frontend env contains placeholder origins: ${placeholders.join(
        ", ",
      )}.`,
    );
  }
}

function cspHeaders(apiBaseUrl: string): string {
  const apiOrigin = new URL(apiBaseUrl).origin;
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${apiOrigin}`,
  ].join("; ");

  return [
    "/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
    "/*",
    "  Cache-Control: public, max-age=0, must-revalidate",
    `  Content-Security-Policy: ${csp}`,
    "  Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=()",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "  X-Content-Type-Options: nosniff",
    "  X-Frame-Options: DENY",
    "",
  ].join("\n");
}

function generatedHeadersPlugin(mode: string, command: string) {
  return {
    name: "generated-security-headers",
    apply: "build" as const,
    closeBundle() {
      if (command !== "build") {
        return;
      }

      const env = loadEnv(mode, appDir, "VITE_");
      const apiBaseUrl = env["VITE_API_BASE_URL"];
      if (!apiBaseUrl) {
        return;
      }

      writeFileSync(
        path.resolve(appDir, "dist/_headers"),
        cspHeaders(apiBaseUrl),
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  assertProductionOriginEnv(mode, command);

  const plugins: PluginOption[] = [
    devtools(),
    tanstackRouter({
      autoCodeSplitting: true,
      generatedRouteTree: "./src/routeTree.gen.ts",
      routeFileIgnorePattern: "routeTree\\.gen\\.ts",
      routesDirectory: "./src/routes",
      target: "react",
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    cloudflare(),
    generatedHeadersPlugin(mode, command),
  ];

  if (analyzeBundle) {
    const bundleAnalyzePlugins = visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
      open: false,
    });

    if (Array.isArray(bundleAnalyzePlugins)) {
      plugins.push(...bundleAnalyzePlugins);
    } else {
      plugins.push(bundleAnalyzePlugins);
    }
  }

  return {
    plugins,

    resolve: {
      alias: {
        "@": path.resolve(appDir, "./src"),
        "@utils": path.resolve(appDir, "./src/utils"),
        "@enums": path.resolve(appDir, "./src/enums"),
        "@components": path.resolve(appDir, "./src/components"),
        "@ui": path.resolve(appDir, "./src/components/ui"),
        "@routes": path.resolve(appDir, "./src/routes"),
        "@pages": path.resolve(appDir, "./src/pages"),
        "@hooks": path.resolve(appDir, "./src/hooks"),
        "@services": path.resolve(appDir, "./src/services"),
        "@config": path.resolve(appDir, "./src/config"),
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
      chunkSizeWarningLimit: 500,
      modulePreload: {
        polyfill: false,
      },
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/packages/dtos-common/")) {
              return "repo-dtos-common";
            }

            if (!id.includes("node_modules")) {
              return undefined;
            }
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/")
            ) {
              return "react-vendor";
            }

            if (id.includes("node_modules/@tanstack/react-router")) {
              return "tanstack-router-vendor";
            }

            if (id.includes("node_modules/@tanstack/")) {
              return "tanstack-query-vendor";
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
        clientFiles: ["./src/main.tsx", "./src/routes/__root.tsx"],
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
      include: [
        "react",
        "react-dom",
        "@tanstack/react-router",
        "@tanstack/react-query",
      ],
    },
  };
});
