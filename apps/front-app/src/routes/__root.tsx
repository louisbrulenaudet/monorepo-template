import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

export interface RouterContext {
  queryClient: QueryClient;
}

const LazyAppDevtools = import.meta.env.DEV
  ? lazy(() => import("#/components/devtools/AppDevtools"))
  : null;

function RootLayout() {
  return (
    <>
      <Outlet />
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
});
