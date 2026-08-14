import { FetchApiError } from "#/utils/fetch-api";

export type ClientSafeErrorDetails = {
  message: string;
  requestId: string | null;
};

const GENERIC_MESSAGE =
  "Something unexpected happened. Try refreshing the page.";
const REQUEST_FAILED_MESSAGE =
  "The request failed. Try again, or quote the request id if it keeps happening.";

/**
 * Client-facing copy only — never echo raw Error.message (may contain internal
 * or privileged wording from upstreams).
 */
export function getClientSafeErrorDetails(
  error: Error,
): ClientSafeErrorDetails {
  if (error instanceof FetchApiError) {
    return {
      message: REQUEST_FAILED_MESSAGE,
      requestId: error.requestId,
    };
  }

  return {
    message: GENERIC_MESSAGE,
    requestId: null,
  };
}
