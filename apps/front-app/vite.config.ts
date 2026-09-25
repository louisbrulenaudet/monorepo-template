import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { DevTools } from "@vitejs/devtools";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv, type Plugin, type PluginOption } from "vite";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const analyzeBundle = process.env["ANALYZE"] === "true";
const repoRoot = path.resolve(appDir, "../..");
const productionEnvKeys = ["VITE_API_BASE_URL"] as const;
const optionalProductionOriginKeys = ["VITE_SENTRY_DSN"] as const;

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

  const placeholders = [
    ...productionEnvKeys,
    ...optionalProductionOriginKeys,
  ].filter((key) => (env[key] ? isPlaceholderOrigin(env[key]) : false));
  if (placeholders.length > 0) {
    throw new Error(
      `Production frontend env contains placeholder or invalid origins: ${placeholders.join(
        ", ",
      )}.`,
    );
  }
}

function cspHeaders(apiBaseUrl: string, sentryDsn: string | undefined): string {
  const connectOrigins = [new URL(apiBaseUrl).origin];
  if (sentryDsn) {
    connectOrigins.push(new URL(sentryDsn).origin);
  }
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
    `connect-src 'self' ${connectOrigins.join(" ")}`,
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
        cspHeaders(apiBaseUrl, env["VITE_SENTRY_DSN"]),
      );
    },
  };
}

const DEBUG_ID_COMMENT = /\/\/# debugId=([\da-f-]+)/;

// @sentry/vite-plugin stamps a debug ID into each chunk but, under rolldown, not
// into its hidden source map; Sentry matches the two only when both carry it.
function sentryDebugIdSourceMapsPlugin(): Plugin {
  return {
    name: "sentry-debug-id-source-maps",
    apply: "build",
    writeBundle(outputOptions, bundle) {
      const outDir = outputOptions.dir;
      if (!outDir) {
        return;
      }
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk" || !output.sourcemapFileName) {
          continue;
        }
        const debugId = DEBUG_ID_COMMENT.exec(output.code)?.[1];
        if (!debugId) {
          continue;
        }
        const mapPath = path.resolve(outDir, output.sourcemapFileName);
        const map: unknown = JSON.parse(readFileSync(mapPath, "utf-8"));
        if (typeof map === "object" && map !== null) {
          writeFileSync(
            mapPath,
            JSON.stringify({ ...map, debug_id: debugId, debugId }),
          );
        }
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  assertProductionOriginEnv(mode, command);

  const plugins: PluginOption[] = [
    devtools({ consolePiping: { enabled: false } }),
    DevTools({ embeddedVisibility: "passive" }),
    tanstackRouter({
      autoCodeSplitting: true,
    }),
    // Native (Rust) React Compiler via oxc-transform-react - no Babel pass.
    react({ compiler: true }),
    tailwindcss(),
    cloudflare(),
    generatedBuildArtifactsPlugin(mode, command),
  ];

  // Last, as the plugin requires. The build only injects debug IDs: the uncached
  // CD step `sentry:sourcemaps` names the release and uploads, so a turbo cache
  // hit cannot skip the upload and the auth token never reaches the build.
  plugins.push(
    sentryVitePlugin({
      telemetry: false,
      release: { name: "", inject: false },
      sourcemaps: { disable: "disable-upload" },
    }),
    sentryDebugIdSourceMapsPlugin(),
  );

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

    define: {
      __SENTRY_DEBUG__: false,
    },

    build: {
      minify: "oxc",
      sourcemap: mode === "development" ? "inline" : "hidden",
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 500,
      rolldownOptions: {
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
                name: "sentry-vendor",
                test: /node_modules[\\/](@sentry|web-vitals)[\\/]/,
                priority: 15,
                // Splits off the tracing code only the lazy sentry-tracing chunk needs.
                entriesAware: true,
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
