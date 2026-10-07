import { useQuery } from "@tanstack/react-query";
import type { HealthProbe } from "#/services/worker-api/health";
import { ApiHealthStatus } from "#/enums/api-health-status";
import { healthQueryOptions } from "#/services/worker-api/health-query-options";

type UseApiHealthResult = {
  status: ApiHealthStatus;
  probe: HealthProbe | undefined;
  error: Error | null;
  isFetching: boolean;
  updatedAt: number;
  refetch: () => void;
};

/** @internal */
export function resolveApiHealthStatus({
  isFetching,
  isPaused,
  isSuccess,
  isError,
}: {
  isFetching: boolean;
  isPaused: boolean;
  isSuccess: boolean;
  isError: boolean;
}): ApiHealthStatus {
  if (isPaused) {
    return ApiHealthStatus.IDLE;
  }

  if (isFetching && !isSuccess) {
    return ApiHealthStatus.CHECKING;
  }

  if (isSuccess) {
    return ApiHealthStatus.HEALTHY;
  }

  if (isError) {
    return ApiHealthStatus.UNHEALTHY;
  }

  return ApiHealthStatus.IDLE;
}

export function useApiHealth(): UseApiHealthResult {
  const {
    data,
    error,
    isFetching,
    isPaused,
    isSuccess,
    isError,
    dataUpdatedAt,
    errorUpdatedAt,
    refetch,
  } = useQuery(healthQueryOptions);

  return {
    status: resolveApiHealthStatus({
      isFetching,
      isPaused,
      isSuccess,
      isError,
    }),
    probe: data,
    error,
    isFetching,
    updatedAt: Math.max(dataUpdatedAt, errorUpdatedAt),
    refetch: () => void refetch({ cancelRefetch: false }),
  };
}
