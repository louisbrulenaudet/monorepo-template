import { createRouter } from "@tanstack/react-router";
import { RouteErrorFallback } from "#/components/feedback/RouteErrorFallback";
import { queryClient } from "#/config/query-client";
import { routeTree } from "./routeTree.gen";

function RouterPending() {
  return (
    <div
      role="status"
      className="flex min-h-96 items-center justify-center text-muted-foreground"
    >
      Loading…
    </div>
  );
}

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingComponent: RouterPending,
  defaultErrorComponent: RouteErrorFallback,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
