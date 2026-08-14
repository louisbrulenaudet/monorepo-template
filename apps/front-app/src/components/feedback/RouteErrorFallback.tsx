import type { ReactNode } from "react";
import { getClientSafeErrorDetails } from "#/utils/client-safe-error";

export type RouteErrorFallbackProps = Readonly<{
  error: Error;
  title?: string;
}>;

export function RouteErrorFallback({
  error,
  title = "Something went wrong.",
}: RouteErrorFallbackProps): ReactNode {
  const { message, requestId } = getClientSafeErrorDetails(error);

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
    </div>
  );
}
