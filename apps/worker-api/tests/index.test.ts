import { AppEnvironment } from "@repo/enums-common";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
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
      version: env.CF_VERSION_METADATA.id,
    });
  });

  it("unknown path returns 404 with the requestId of its X-Request-Id header", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/does-not-exist"),
    );

    expect(response.status).toBe(404);
    const body: unknown = await response.json();
    expect(body).toEqual({
      error: "Not Found",
      requestId: response.headers.get("X-Request-Id"),
    });
  });

  it("logs a thrown 5xx with the request id it returned", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const response = await app.request(
      "http://example.com/api/v1/health",
      {},
      { ...env, ENVIRONMENT: AppEnvironment.PRODUCTION, CORS_ORIGINS: "" },
    );

    expect(response.status).toBe(503);
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        requestId: response.headers.get("X-Request-Id"),
        status: 503,
      }),
    );
  });

  it("renders a thrown 4xx without logging it", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const response = await app.request(
      "http://example.com/api/v1/health",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
      { ...env, CORS_ORIGINS: "https://app.example.com" },
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Forbidden",
      requestId: response.headers.get("X-Request-Id"),
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each([
    { environment: AppEnvironment.DEV, sent: true },
    { environment: AppEnvironment.STAGING, sent: false },
    { environment: AppEnvironment.PREVIEW, sent: false },
    { environment: AppEnvironment.PRODUCTION, sent: false },
  ])(
    "Server-Timing on API responses in $environment: $sent",
    async ({ environment, sent }) => {
      const response = await app.request(
        "http://example.com/api/v1/health",
        {},
        {
          ...env,
          ENVIRONMENT: environment,
          CORS_ORIGINS: "https://app.example.com",
        },
      );

      expect(response.status).toBe(200);
      expect(response.headers.has("Server-Timing")).toBe(sent);
    },
  );
});
