import type { QueryClient } from "@tanstack/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import "@/App.css";

export interface RouterContext {
  queryClient: QueryClient;
}

function RootLayout() {
  const router = useRouter();

  return (
    <>
      <Outlet />
      {import.meta.env.DEV ? (
        <TanStackDevtools
          config={{ hideUntilHover: true }}
          plugins={[
            {
              id: "react-query",
              name: "React Query",
              render: () => <ReactQueryDevtoolsPanel />,
            },
            {
              id: "router",
              name: "Router",
              render: () => <TanStackRouterDevtoolsPanel router={router} />,
            },
          ]}
        />
      ) : null}
    </>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});
