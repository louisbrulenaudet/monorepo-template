import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { healthQueryOptions } from "#/services/worker-api/health-query-options";

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("healthQueryOptions", () => {
  it("uses the stable worker-api health query key", () => {
    expect(healthQueryOptions.queryKey).toEqual(["worker-api", "health"]);
  });

  it("fetchQuery and ensureQueryData return the shared health contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<() => Promise<Response>>(() =>
        Promise.resolve(
          Response.json({ status: "ok" }, { status: 200, statusText: "OK" }),
        ),
      ),
    );

    const queryClient = createTestQueryClient();

    await expect(queryClient.fetchQuery(healthQueryOptions)).resolves.toEqual({
      status: "ok",
    });

    // Mirrors apps/front-app/src/routes/index.tsx loader.
    await expect(
      queryClient.ensureQueryData(healthQueryOptions),
    ).resolves.toEqual({ status: "ok" });
  });
});
