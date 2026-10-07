import { type ReactNode, useSyncExternalStore } from "react";
import { Button } from "#/components/ui/Button";
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
      className="flex min-h-96 flex-col items-center justify-center gap-4 text-center text-foreground"
    >
      <title>Error · Monorepo template</title>
      <h1 className="text-title text-balance">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      {requestId ? (
        <p className="text-xs text-muted-foreground">
          Request id: <span className="select-all">{requestId}</span>
        </p>
      ) : null}
      {eventId ? (
        <p className="text-xs text-muted-foreground">
          Error id: <span className="select-all">{eventId}</span>
        </p>
      ) : null}
      <Button variant="secondary" onClick={() => window.location.reload()}>
        Reload page
      </Button>
    </div>
  );
}
