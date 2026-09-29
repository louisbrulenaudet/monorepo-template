import type { AppEnvironment } from "@repo/enums-common";
import type {
  ConfigContext,
  SecretBinding,
  TextBinding,
  WorkerConfig,
  WorkerEntrypointExport,
} from "cf/config";
import { bindings, defineConfig, exports } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

type Observability = NonNullable<WorkerConfig["observability"]>;

type Deployment = {
  name: string;
  environment: AppEnvironment;
  corsOrigins: string;
  sentryDsn: SecretBinding | TextBinding<"">;
  previewUrls: boolean;
  observability: Observability;
  cache: NonNullable<WorkerConfig["cache"]>;
  exports: { default?: WorkerEntrypointExport };
};

const SAMPLED_TRACES: Observability = {
  enabled: true,
  traces: { enabled: true, headSamplingRate: 0.01 },
};

const EDGE_CACHE: Pick<Deployment, "cache" | "exports"> = {
  cache: { enabled: true },
  exports: { default: exports.worker({ cache: { enabled: false } }) },
};

const DEPLOYMENTS: Record<
  "development" | "staging" | "production",
  Deployment
> = {
  development: {
    name: "worker-api",
    environment: "dev",
    corsOrigins: "http://localhost:5174",
    sentryDsn: bindings.secret(),
    previewUrls: false,
    observability: {
      enabled: true,
      logs: { headSamplingRate: 1 },
      traces: { enabled: true, headSamplingRate: 1 },
    },
    cache: { enabled: false },
    exports: {},
  },
  staging: {
    name: "worker-api-staging",
    environment: "staging",
    corsOrigins: "",
    sentryDsn: bindings.secret(),
    previewUrls: false,
    observability: SAMPLED_TRACES,
    ...EDGE_CACHE,
  },
  production: {
    name: "worker-api-production",
    environment: "production",
    corsOrigins: "",
    sentryDsn: bindings.secret(),
    previewUrls: true,
    observability: SAMPLED_TRACES,
    ...EDGE_CACHE,
  },
};

const TEST: Deployment = {
  ...DEPLOYMENTS.development,
  sentryDsn: bindings.text(""),
};

const PREVIEW: Deployment = {
  ...DEPLOYMENTS.production,
  environment: "preview",
  sentryDsn: bindings.text(""),
  observability: {
    enabled: true,
    logs: { enabled: true, invocationLogs: true, persist: true },
    traces: { enabled: true, headSamplingRate: 1, persist: true },
  },
};

function selectDeployment({ mode, isPreview }: ConfigContext): Deployment {
  if (isPreview) {
    if (mode !== "production") {
      throw new Error(
        `Previews run under the production Worker: pass --mode production, not "${mode}".`,
      );
    }
    return PREVIEW;
  }
  if (mode === "test") {
    return TEST;
  }
  if (mode === "development" || mode === "staging" || mode === "production") {
    return DEPLOYMENTS[mode];
  }
  throw new Error(
    `Unknown mode "${mode}": pass --mode development, staging, or production.`,
  );
}

export default defineConfig({
  worker: (ctx) => {
    const deployment = selectDeployment(ctx);
    return {
      name: deployment.name,
      entrypoint,
      compatibilityDate: "2026-09-23",
      previewUrls: deployment.previewUrls,
      cache: deployment.cache,
      observability: deployment.observability,
      env: {
        ENVIRONMENT: bindings.text(deployment.environment),
        CORS_ORIGINS: bindings.text(deployment.corsOrigins),
        SENTRY_DSN: deployment.sentryDsn,
        CF_VERSION_METADATA: bindings.versionMetadata(),
      },
      exports: deployment.exports,
    };
  },
});
