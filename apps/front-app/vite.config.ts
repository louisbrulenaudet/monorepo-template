import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools as tanstackDevtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv, type Plugin, type PluginOption } from "vite";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const envDir = process.env["SKIP_ENV_FILES"] ? false : appDir;
const analyzeBundle = process.env["ANALYZE"] === "true";
const isStaticAnalysis = process.argv.some((arg) => arg.includes("knip"));
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
  if (isStaticAnalysis || command !== "build" || mode !== "production") {
    return;
  }

  const env = loadEnv(mode, envDir, "VITE_");
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
    `  Content-Security-Policy: ${csp}`,
    "  Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=()",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "  Strict-Transport-Security: max-age=31536000; includeSubDomains",
    "  X-Content-Type-Options: nosniff",
    "  X-Frame-Options: DENY",
    "",
  ].join("\n");
}

function generatedBuildArtifactsPlugin(mode: string): Plugin {
  return {
    name: "generated-build-artifacts",
    apply: "build",
    applyToEnvironment: (environment) => environment.name === "client",
    generateBundle() {
      const env = loadEnv(mode, envDir, "VITE_");
      const apiBaseUrl = env["VITE_API_BASE_URL"];
      if (!apiBaseUrl) {
        throw new Error(
          "Missing VITE_API_BASE_URL: cannot generate _headers. " +
            "Set it in apps/front-app/.env.production or the deploy environment.",
        );
      }

      this.emitFile({
        type: "asset",
        fileName: "_headers",
        source: cspHeaders(apiBaseUrl, env["VITE_SENTRY_DSN"]),
      });
      this.emitFile({
        type: "asset",
        fileName: ".assetsignore",
        source: "*.map\n",
      });
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
    ...tanstackDevtools({
      consolePiping: { enabled: false },
      eventBusConfig: { enabled: false },
    }).filter(
      (plugin) => plugin.name !== "@tanstack/devtools:event-client-setup",
    ),
    tanstackRouter({
      autoCodeSplitting: true,
    }),
    react({ compiler: { reportDiagnostics: true } }),
    tailwindcss(),
    cloudflare({ types: { generate: false } }),
    generatedBuildArtifactsPlugin(mode),
  ];

  // Last, as the plugin requires. Upload is the uncached CD step
  // `sentry:sourcemaps`: a cache hit cannot skip it; the build holds no token.
  plugins.push(
    sentryVitePlugin({
      telemetry: false,
      release: { name: "", inject: false },
      sourcemaps: { disable: "disable-upload" },
    }),
    sentryDebugIdSourceMapsPlugin(),
  );

  if (analyzeBundle) {
    plugins.push(
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    );
  }

  return {
    plugins,
    devtools: { apply: "serve", embeddedVisibility: "passive", mcp: false },
    envDir,
    css: {
      devSourcemap: true,
    },

    define: {
      __SENTRY_DEBUG__: false,
    },

    build: {
      minify: "oxc",
      sourcemap: mode === "development" ? "inline" : "hidden",
      reportCompressedSize: analyzeBundle,
      rolldownOptions: {
        ...(analyzeBundle ? { devtools: {} } : {}),
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
            ],
          },
        },
      },
    },

    server: {
      port: 5174,
      strictPort: true,
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
