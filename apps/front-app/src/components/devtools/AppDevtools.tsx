import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

/**
 * Dev-only panel. Loaded via `lazy()` from `__root.tsx` so production builds
 * never statically import these packages.
 */
export default function AppDevtools() {
  const router = useRouter();

  return (
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
  );
}
