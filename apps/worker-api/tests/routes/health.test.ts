import { HealthResponseSchema } from "@repo/dtos-common/api";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import app from "../../src/index";

void app;

describe("GET /api/v1/health", () => {
  it("returns the shared health contract and probe headers", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/api/v1/health"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const versionId = response.headers.get("X-Worker-Version-Id");
    expect(versionId).toBeTruthy();

    const requestId = response.headers.get("X-Request-Id");
    expect(requestId).toBeTruthy();

    const body: unknown = await response.json();
    expect(HealthResponseSchema.parse(body)).toEqual({
      status: "ok",
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
    });
  });

  it("echoes a valid client X-Request-Id for SPA correlation", async () => {
    const clientId = "550e8400-e29b-41d4-a716-446655440000";
    const response = await exports.default.fetch(
      new Request("http://example.com/api/v1/health", {
        headers: { "X-Request-Id": clientId },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-Id")).toBe(clientId);
  });

  it("rejects non-opaque client request ids", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/api/v1/health", {
        headers: { "X-Request-Id": "matter-abc" },
      }),
    );

    expect(response.status).toBe(200);
    const echoed = response.headers.get("X-Request-Id");
    expect(echoed).toBeTruthy();
    expect(echoed).not.toBe("matter-abc");
  });
});
