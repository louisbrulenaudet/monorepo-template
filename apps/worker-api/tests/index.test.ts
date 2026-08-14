import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
// Side-effect import so Vitest re-runs when the Worker entry changes.
import app from "../src/index";

void app;

describe("worker-api root", () => {
  it("GET / returns gateway metadata with version metadata id", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/"),
    );

    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toEqual({
      message: "Worker API",
      version: expect.stringMatching(/\S/),
    });
  });

  it("unknown path returns 404 with requestId", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/does-not-exist"),
    );

    expect(response.status).toBe(404);
    const body: unknown = await response.json();
    expect(body).toEqual({
      error: "Not Found",
      requestId: expect.any(String),
    });
  });
});
