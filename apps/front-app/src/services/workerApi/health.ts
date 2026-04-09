// src/services/workerApi/health.ts

import { HealthResponseSchema } from "@repo/dtos-common/api";
import { fetchJsonWithSchema } from "@utils/fetch-api";
import { workerApiBaseUrl } from "@/config/env";

export async function getHealth(options?: {
  signal?: AbortSignal;
  timeoutMs?: number;
  dedupe?: boolean;
}): Promise<void> {
  await fetchJsonWithSchema(
    `${workerApiBaseUrl}/api/v1/health`,
    HealthResponseSchema,
    {
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      dedupe: options?.dedupe,
    },
  );
}
