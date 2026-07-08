import { ApiHealthStatus } from "@enums/api-health-status";
import { useQuery } from "@tanstack/react-query";
import { healthQueryOptions } from "@/services/worker-api/health-query-options";

type UseApiHealthResult = {
  status: ApiHealthStatus;
};

function resolveApiHealthStatus({
  isFetching,
  isPending,
  isSuccess,
  isError,
}: {
  isFetching: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
}): ApiHealthStatus {
  if (isFetching && isPending) {
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
  const { isFetching, isPending, isSuccess, isError } =
    useQuery(healthQueryOptions);

  const status = resolveApiHealthStatus({
    isFetching,
    isPending,
    isSuccess,
    isError,
  });

  return { status };
}
