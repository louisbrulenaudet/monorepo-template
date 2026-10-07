import { CorsExposedHeader } from "@repo/enums-common";
import { describe, expect, it } from "vitest";
import { apiBaseUrl } from "#/config/env";
import { getHealth } from "#/services/worker-api/health";
import { stubFetchJson } from "../../helpers/fetch-stub";

describe("getHealth", () => {
  it("GETs /api/v1/health and returns the contract with request id and latency", async () => {
    const requestId = "550e8400-e29b-41d4-a716-446655440000";
    const fetchMock = stubFetchJson(
      { status: "ok", version: "0.0.0" },
      { headers: { [CorsExposedHeader.X_REQUEST_ID]: requestId } },
    );

    await expect(getHealth()).resolves.toEqual({
      status: "ok",
      version: "0.0.0",
      requestId,
      latencyMs: expect.any(Number),
    });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${apiBaseUrl}/api/v1/health`,
      expect.anything(),
    );
  });
});
