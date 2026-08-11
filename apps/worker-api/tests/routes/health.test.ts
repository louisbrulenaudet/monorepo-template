import { HealthResponseSchema } from "@repo/dtos-common/api";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
// Side-effect import so Vitest re-runs when the Worker entry changes.
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
    expect(HealthResponseSchema.parse(body)).toEqual({ status: "ok" });
  });
});
