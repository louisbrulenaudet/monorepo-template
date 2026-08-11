import { afterEach, describe, expect, it, vi } from "vitest";
import { apiBaseUrl } from "#/config/env";
import { getHealth } from "#/services/worker-api/health";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getHealth", () => {
  it("GETs /api/v1/health and returns the shared contract", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({ status: "ok" }, { status: 200, statusText: "OK" }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getHealth({ dedupe: false, timeoutMs: 0 })).resolves.toEqual({
      status: "ok",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${apiBaseUrl}/api/v1/health`);
    expect(init).toMatchObject({ method: "GET" });
  });
});
