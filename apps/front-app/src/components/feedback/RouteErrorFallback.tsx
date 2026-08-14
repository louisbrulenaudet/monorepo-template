import type { ReactNode } from "react";

export type RouteErrorFallbackProps = Readonly<{
  error: Error;
  title?: string;
}>;

export function RouteErrorFallback({
  error,
  title = "Something went wrong.",
}: RouteErrorFallbackProps): ReactNode {
  return (
    <div
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-2 text-foreground"
    >
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}
