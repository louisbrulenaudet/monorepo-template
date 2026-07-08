import { createRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { queryClient } from "@/config/query-client";
import { routeTree } from "./routeTree.gen";

function RouterPending() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center text-slate-300"
      aria-busy="true"
    >
      Loading…
    </div>
  );
}

function RouterError({ error }: ErrorComponentProps) {
  return (
    <div
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-2 text-slate-200"
    >
      <p className="font-medium">Something went wrong.</p>
      <p className="text-sm text-slate-400">{error.message}</p>
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
  defaultErrorComponent: RouterError,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
