import { queryOptions } from "@tanstack/react-query";
import { getHealth } from "./health";

export const healthQueryOptions = queryOptions({
  queryKey: ["worker-api", "health"] as const,
  queryFn: ({ signal }) =>
    getHealth({ signal, timeoutMs: 6000, dedupe: false }),
});
