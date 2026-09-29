import type { AppEnvironment } from "@repo/enums-common";
import type { ConfigContext, WorkerConfig } from "cf/config";
import { bindings, defineConfig } from "cf/config";

type Observability = NonNullable<WorkerConfig["observability"]>;

type Deployment = {
  name: string;
  environment: AppEnvironment;
  previewUrls: boolean;
  observability: Observability;
};

const SAMPLED_TRACES: Observability = {
  enabled: true,
  traces: { enabled: true, headSamplingRate: 0.01 },
};

const DEPLOYMENTS: Record<
  "development" | "staging" | "production",
  Deployment
> = {
  development: {
    name: "front-app",
    environment: "dev",
    previewUrls: false,
    observability: {
      enabled: true,
      logs: { headSamplingRate: 1 },
      traces: { enabled: true, headSamplingRate: 1 },
    },
  },
  staging: {
    name: "front-app-staging",
    environment: "staging",
    previewUrls: false,
    observability: SAMPLED_TRACES,
  },
  production: {
    name: "front-app-production",
    environment: "production",
    previewUrls: true,
    observability: SAMPLED_TRACES,
  },
};

function selectDeployment({ mode, isPreview }: ConfigContext): Deployment {
  if (isPreview) {
    if (mode !== "production") {
      throw new Error(
        `Previews run under the production Worker: pass --mode production, not "${mode}".`,
      );
    }
    return { ...DEPLOYMENTS.production, environment: "preview" };
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
      compatibilityDate: "2026-09-23",
      previewUrls: deployment.previewUrls,
      assets: { notFoundHandling: "single-page-application" },
      observability: deployment.observability,
      env: {
        ENVIRONMENT: bindings.text(deployment.environment),
      },
    };
  },
});
