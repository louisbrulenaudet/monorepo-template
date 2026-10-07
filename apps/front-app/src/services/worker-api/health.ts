import {
  type HealthResponse,
  HealthResponseSchema,
} from "@repo/dtos-common/api";
import { apiBaseUrl } from "#/config/env";
import { type FetchJsonOptions, fetchJsonWithSchema } from "#/utils/fetch-api";

export const HEALTH_PATH = "/api/v1/health";

export type HealthProbe = HealthResponse & {
  requestId: string | null;
  latencyMs: number;
};

export async function getHealth(
  options?: FetchJsonOptions,
): Promise<HealthProbe> {
  const startedAt = performance.now();
  const { data, requestId } = await fetchJsonWithSchema(
    `${apiBaseUrl}${HEALTH_PATH}`,
    HealthResponseSchema,
    options,
  );
  return {
    ...data,
    requestId,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}
