import {
  CancelledError,
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { captureClientError } from "#/config/sentry";
import { FetchApiError } from "#/utils/fetch-api";

/** @internal */
export function createQueryClient(
  reportError: (error: unknown) => void,
): QueryClient {
  // An HTTP error response is worker-api's to report (its 5xx already reach
  // Sentry, and 4xx are expected). A copy that also reaches an error boundary is
  // dropped by Sentry, which skips an error object it has already captured.
  const reportUnexpectedError = (error: unknown): void => {
    if (error instanceof FetchApiError || error instanceof CancelledError) {
      return;
    }
    reportError(error);
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError: reportUnexpectedError }),
    mutationCache: new MutationCache({ onError: reportUnexpectedError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export const queryClient = createQueryClient(captureClientError);
