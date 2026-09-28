import { type ReactNode, useSyncExternalStore } from "react";
import { sentryEventId, subscribeToSentryEventIds } from "#/config/sentry";
import { getClientSafeErrorDetails } from "#/utils/client-safe-error";

export type RouteErrorFallbackProps = Readonly<{
  error: unknown;
  title?: string;
}>;

export function RouteErrorFallback({
  error,
  title = "Something went wrong.",
}: RouteErrorFallbackProps): ReactNode {
  const { message, requestId } = getClientSafeErrorDetails(error);
  const eventId = useSyncExternalStore(subscribeToSentryEventIds, () =>
    sentryEventId(error),
  );

  return (
    <div
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-2 text-foreground"
    >
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      {requestId ? (
        <p className="text-xs text-muted-foreground">Request id: {requestId}</p>
      ) : null}
      {eventId ? (
        <p className="text-xs text-muted-foreground">Error id: {eventId}</p>
      ) : null}
    </div>
  );
}
