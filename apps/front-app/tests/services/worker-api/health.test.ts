import { describe, expect, it } from "vitest";
import { apiBaseUrl } from "#/config/env";
import { getHealth } from "#/services/worker-api/health";
import { stubFetchJson } from "../../helpers/fetch-stub";

describe("getHealth", () => {
  it("GETs /api/v1/health and returns the shared contract", async () => {
    const fetchMock = stubFetchJson({ status: "ok", version: "0.0.0" });

    await expect(getHealth()).resolves.toEqual({
      status: "ok",
      version: "0.0.0",
    });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${apiBaseUrl}/api/v1/health`,
      expect.anything(),
    );
  });
});
