import type { AppEnvironment } from "@repo/enums-common";
import type { RequestIdVariables } from "hono/request-id";

export type BaseBindings = {
  ENVIRONMENT: AppEnvironment;
  SENTRY_DSN: string;
};

export type HonoEnv<Bindings extends BaseBindings> = {
  Bindings: Bindings;
  Variables: RequestIdVariables;
};
