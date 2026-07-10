import {
  type HealthResponse,
  HealthResponseSchema,
} from "@repo/dtos-common/api";
import { fetchJsonWithSchema } from "@utils/fetch-api";
import { apiBaseUrl } from "@/config/env";

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
