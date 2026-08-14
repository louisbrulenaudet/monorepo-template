import { describe, expect, it } from "vitest";
import { ApiHealthStatus } from "#/enums/api-health-status";
import { resolveApiHealthStatus } from "#/hooks/use-api-health";

describe("resolveApiHealthStatus", () => {
  it("returns CHECKING on the initial fetch", () => {
    expect(
      resolveApiHealthStatus({
        isFetching: true,
        isPending: true,
        isSuccess: false,
        isError: false,
      }),
    ).toBe(ApiHealthStatus.CHECKING);
  });

  it("returns HEALTHY after a successful query", () => {
    expect(
      resolveApiHealthStatus({
        isFetching: false,
        isPending: false,
        isSuccess: true,
        isError: false,
      }),
    ).toBe(ApiHealthStatus.HEALTHY);
  });

  it("returns UNHEALTHY after a failed query", () => {
    expect(
      resolveApiHealthStatus({
        isFetching: false,
        isPending: false,
        isSuccess: false,
        isError: true,
      }),
    ).toBe(ApiHealthStatus.UNHEALTHY);
  });

  it("returns IDLE when not fetching and not settled", () => {
    expect(
      resolveApiHealthStatus({
        isFetching: false,
        isPending: false,
        isSuccess: false,
        isError: false,
      }),
    ).toBe(ApiHealthStatus.IDLE);
  });
});
