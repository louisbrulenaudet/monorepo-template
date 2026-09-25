import { describe, expect, it } from "vitest";
import { ApiHealthStatus } from "#/enums/api-health-status";
import { resolveApiHealthStatus } from "#/hooks/use-api-health";

describe("resolveApiHealthStatus", () => {
  it.each([
    {
      when: "the initial fetch is in flight",
      state: {
        isFetching: true,
        isPending: true,
        isSuccess: false,
        isError: false,
      },
      expected: ApiHealthStatus.CHECKING,
    },
    {
      when: "the query succeeded",
      state: {
        isFetching: false,
        isPending: false,
        isSuccess: true,
        isError: false,
      },
      expected: ApiHealthStatus.HEALTHY,
    },
    {
      when: "the query failed",
      state: {
        isFetching: false,
        isPending: false,
        isSuccess: false,
        isError: true,
      },
      expected: ApiHealthStatus.UNHEALTHY,
    },
    {
      when: "the initial fetch is paused",
      state: {
        isFetching: false,
        isPending: true,
        isSuccess: false,
        isError: false,
      },
      expected: ApiHealthStatus.IDLE,
    },
  ])("returns $expected when $when", ({ state, expected }) => {
    expect(resolveApiHealthStatus(state)).toBe(expected);
  });
});
