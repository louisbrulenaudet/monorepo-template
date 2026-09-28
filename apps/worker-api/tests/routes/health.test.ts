import { HealthResponseSchema } from "@repo/dtos-common/api";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import app from "../../src/index";

void app;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("GET /api/v1/health", () => {
  it("returns the shared health contract and probe headers", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/api/v1/health"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Worker-Version-Id")).toBe(
      env.CF_VERSION_METADATA.id,
    );
    expect(response.headers.get("X-Request-Id")).toMatch(UUID_V4);

    const body: unknown = await response.json();
    expect(HealthResponseSchema.parse(body)).toEqual({
      status: "ok",
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
    });
  });

  it("mints its own request id instead of trusting the client's", async () => {
    const clientId = "550e8400-e29b-41d4-a716-446655440000";
    const response = await exports.default.fetch(
      new Request("http://example.com/api/v1/health", {
        headers: { "X-Request-Id": clientId },
      }),
    );

    expect(response.status).toBe(200);
    const requestId = response.headers.get("X-Request-Id");
    expect(requestId).toMatch(UUID_V4);
    expect(requestId).not.toBe(clientId);
  });
});
