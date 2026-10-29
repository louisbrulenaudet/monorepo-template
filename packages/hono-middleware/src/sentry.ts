import type { Hono } from "hono";
import { AppEnvironment } from "@repo/enums-common";
import { sentry } from "@sentry/hono/cloudflare";
import type { BaseBindings, HonoEnv } from "./env";

// Mirrors each mode's observability.traces.headSamplingRate in cloudflare.config.ts.
const FULL_TRACING_ENVIRONMENTS = new Set<AppEnvironment>([
  AppEnvironment.DEV,
  AppEnvironment.PREVIEW,
]);
const SAMPLED_TRACES_RATE = 0.01;
const DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  stackFrameVariables: false,
  databaseQueryData: false,
  queues: false,
  genAI: { inputs: false, outputs: false },
  graphQL: { document: false, variables: false },
  mcp: { inputs: false, outputs: false },
};

export function sentryMiddleware<Bindings extends BaseBindings>(
  app: Hono<HonoEnv<Bindings>>,
  { release }: { release: string },
) {
  return sentry(app, (env) => ({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
    release,
    // A rate, not a sampler: a sampler's return value replaces the SPA's sampling decision.
    tracesSampleRate: FULL_TRACING_ENVIRONMENTS.has(env.ENVIRONMENT)
      ? 1
      : SAMPLED_TRACES_RATE,
    dataCollection: DATA_COLLECTION,
    // Console text can carry sensitive user data; errorHandler already logs
    // the stack to Workers Observability.
    beforeBreadcrumb: (breadcrumb) =>
      breadcrumb.category === "console" ? null : breadcrumb,
  }));
}
