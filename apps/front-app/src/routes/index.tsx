import { createFileRoute } from "@tanstack/react-router";
import { healthQueryOptions } from "@/services/worker-api/health-query-options";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(healthQueryOptions),
});
