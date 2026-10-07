import { describe, expect, it } from "vitest";
import { ApiHealthStatus } from "#/enums/api-health-status";
import { resolveApiHealthStatus } from "#/hooks/use-api-health";

const settled = {
  isFetching: false,
  isPaused: false,
  isSuccess: false,
  isError: false,
};

describe("resolveApiHealthStatus", () => {
  it.each([
    {
      when: "the initial fetch is in flight",
      state: { ...settled, isFetching: true },
      expected: ApiHealthStatus.CHECKING,
    },
    {
      when: "the query succeeded",
      state: { ...settled, isSuccess: true },
      expected: ApiHealthStatus.HEALTHY,
    },
    {
      when: "a re-probe runs after a success",
      state: { ...settled, isFetching: true, isSuccess: true },
      expected: ApiHealthStatus.HEALTHY,
    },
    {
      when: "the query failed",
      state: { ...settled, isError: true },
      expected: ApiHealthStatus.UNHEALTHY,
    },
    {
      when: "a re-probe runs after a failure",
      state: { ...settled, isFetching: true, isError: true },
      expected: ApiHealthStatus.CHECKING,
    },
    {
      when: "the initial fetch is paused",
      state: { ...settled, isPaused: true },
      expected: ApiHealthStatus.IDLE,
    },
    {
      when: "a re-probe is paused with a retained success",
      state: { ...settled, isPaused: true, isSuccess: true },
      expected: ApiHealthStatus.IDLE,
    },
  ])("returns $expected when $when", ({ state, expected }) => {
    expect(resolveApiHealthStatus(state)).toBe(expected);
  });
});
