import {
  type HealthResponse,
  HealthResponseSchema,
} from "@repo/dtos-common/api";
import { apiBaseUrl } from "#/config/env";
import { fetchJsonWithSchema } from "#/utils/fetch-api";

export async function getHealth(options?: {
  signal?: AbortSignal;
  timeoutMs?: number;
  dedupe?: boolean;
}): Promise<HealthResponse> {
  return fetchJsonWithSchema(
    `${apiBaseUrl}/api/v1/health`,
    HealthResponseSchema,
    options,
  );
}
