// apps/front-app/vite.config.ts

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { DevTools } from "@vitejs/devtools";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "node:fs";
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
      hostname.endsWith(".example.com") ||
      hostname.endsWith(".your-domain.com") ||
      hostname === "your-worker-api.workers.dev"
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
  // style-src unsafe-inline is deliberate for Vite/Tailwind injected styles;
  // keep script-src strict (no unsafe-inline / unsafe-eval).
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
    "  Strict-Transport-Security: max-age=31536000; includeSubDomains",
    "  X-Content-Type-Options: nosniff",
    "  X-Frame-Options: DENY",
    "",
  ].join("\n");
}

function generatedBuildArtifactsPlugin(mode: string, command: string) {
  return {
    name: "generated-build-artifacts",
    apply: "build" as const,
    closeBundle() {
      if (command !== "build") {
        return;
      }

      const isStaticAnalysis = process.argv.some((arg) => arg.includes("knip"));
      if (isStaticAnalysis) {
        return;
      }

      // `hidden` sourcemaps stay on the CI artifact for symbolication but must
      // never be uploaded as public Workers Assets.
      const assetsIgnorePath = path.resolve(appDir, "dist/.assetsignore");
      const assetsIgnore = readFileSync(assetsIgnorePath, "utf-8");
      if (!assetsIgnore.split("\n").includes("*.map")) {
        writeFileSync(assetsIgnorePath, `${assetsIgnore.trimEnd()}\n*.map\n`);
      }

      const env = loadEnv(mode, appDir, "VITE_");
      const apiBaseUrl = env["VITE_API_BASE_URL"];
      if (!apiBaseUrl) {
        throw new Error(
          "Missing VITE_API_BASE_URL: cannot generate dist/_headers. " +
            "Set it in apps/front-app/.env.production or the deploy environment.",
        );
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
    devtools({ consolePiping: { enabled: false } }),
    DevTools({ embeddedVisibility: "normal" }),
    tanstackRouter({
      autoCodeSplitting: true,
    }),
    // Native (Rust) React Compiler via oxc-transform-react - no Babel pass.
    react({ compiler: true }),
    tailwindcss(),
    cloudflare(),
    generatedBuildArtifactsPlugin(mode, command),
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
    css: {
      devSourcemap: true,
    },

    build: {
      minify: "oxc",
      sourcemap: mode === "development" ? "inline" : "hidden",
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 500,
      rolldownOptions: {
        // Required: without it no build writes `node_modules/.rolldown`
        // (see .claude/rules/frontend/vite-config.md).
        devtools: {},
        onLog(level, log, log2) {
          if (
            level === "warn" &&
            log.code === "SOURCEMAP_BROKEN" &&
            log.message.includes("(vite:css)")
          ) {
            return;
          }
          log2(level, log);
        },
        output: {
          codeSplitting: {
            groups: [
              {
                name: "react-vendor",
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 30,
              },
              {
                name: "tanstack-router-vendor",
                test: /node_modules[\\/]@tanstack[\\/]react-router[\\/]/,
                priority: 20,
              },
              {
                name: "tanstack-vendor",
                test: /node_modules[\\/]@tanstack[\\/]/,
                priority: 10,
              },
              {
                name: "repo-dtos-common",
                test: /packages[\\/]dtos-common[\\/]/,
                priority: 10,
              },
              {
                name: "vendor",
                test: /node_modules/,
                priority: 0,
              },
            ],
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
      // Forward browser warnings/errors (and unhandled exceptions, with
      // source-mapped stack traces) to the terminal so agentic dev loops can
      // read runtime failures without a screenshot.
      forwardConsole: {
        unhandledErrors: true,
        logLevels: ["warn", "error"],
      },
      warmup: {
        clientFiles: [
          "./src/main.tsx",
          "./src/router.tsx",
          "./src/routes/__root.tsx",
        ],
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
