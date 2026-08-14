import { describe, expect, it } from "vitest";
import { ApiHealthStatus } from "#/enums/api-health-status";
import {
  getApiHealthDotClassName,
  getApiHealthPresentation,
} from "#/utils/api-health-dot";

describe("getApiHealthPresentation", () => {
  it("maps each status to a label and dot class", () => {
    expect(getApiHealthPresentation(ApiHealthStatus.CHECKING).label).toBe(
      "Checking…",
    );
    expect(getApiHealthPresentation(ApiHealthStatus.HEALTHY).label).toBe(
      "Healthy",
    );
    expect(getApiHealthPresentation(ApiHealthStatus.UNHEALTHY).label).toBe(
      "Unhealthy",
    );
    expect(getApiHealthPresentation(ApiHealthStatus.IDLE).label).toBe(
      "API status",
    );
  });
});

describe("getApiHealthDotClassName", () => {
  it("includes pulse for checking and glow/shake for settled states", () => {
    expect(getApiHealthDotClassName(ApiHealthStatus.CHECKING)).toContain(
      "animate-pulse",
    );
    expect(getApiHealthDotClassName(ApiHealthStatus.HEALTHY)).toContain(
      "animate-health-glow",
    );
    expect(getApiHealthDotClassName(ApiHealthStatus.UNHEALTHY)).toContain(
      "animate-health-shake",
    );
  });
});
