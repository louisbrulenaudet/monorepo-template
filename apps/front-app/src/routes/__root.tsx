import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy, Suspense, type ReactNode } from "react";
import { version } from "../../package.json";

export interface RouterContext {
  queryClient: QueryClient;
}

const LazyAppDevtools = import.meta.env.DEV
  ? lazy(() => import("#/components/devtools/AppDevtools"))
  : null;

function RootLayout(): ReactNode {
  return (
    <>
      <div className="mx-auto max-w-7xl p-8 text-center">
        <Outlet />
        <footer className="pt-2 text-xs text-neutral-500">v{version}</footer>
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
});
