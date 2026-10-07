import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy, Suspense, type ReactNode } from "react";
import { NotFoundFallback } from "#/components/feedback/NotFoundFallback";

export interface RouterContext {
  queryClient: QueryClient;
}

const LazyAppDevtools = import.meta.env.DEV
  ? lazy(() => import("#/components/devtools/AppDevtools"))
  : null;

function RootLayout(): ReactNode {
  return (
    <>
      <div className="relative isolate overflow-x-clip">
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 hidden w-band -translate-x-1/2 rails-dashed sm:block"
          aria-hidden="true"
        >
          <div className="size-full bg-dots" />
        </div>
        <div className="sm:px-6 lg:px-10">
          <div className="mx-auto flex min-h-dvh max-w-frame flex-col bg-background sm:rails-dashed">
            <main className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 sm:py-12">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
      {LazyAppDevtools ? (
        <Suspense fallback={null}>
          <LazyAppDevtools />
        </Suspense>
      ) : null}
    </>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundFallback,
});
