import { AppEnvironment } from "@repo/enums-common";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import app from "../../src/index";

void app;

type WorkerEnv = typeof env;

function withEnv(overrides: Partial<WorkerEnv>): WorkerEnv {
  return { ...env, ...overrides };
}

describe("CORS and CSRF middleware", () => {
  it("exposes X-Request-Id and locked-down CSP on API responses", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/api/v1/health"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "default-src 'none'",
    );
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers.get("Permissions-Policy")).toMatch(/camera=\(\)/);
  });

  it("allows CORS for an Origin on the allowlist", async () => {
    const response = await app.request(
      "http://example.com/api/v1/health",
      {
        headers: { Origin: "http://localhost:5174" },
      },
      withEnv({
        ENVIRONMENT: AppEnvironment.DEV,
        CORS_ORIGINS: "http://localhost:5174",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5174",
    );
    expect(response.headers.get("Access-Control-Expose-Headers")).toContain(
      "X-Request-Id",
    );
  });

  it("does not reflect a disallowed Origin", async () => {
    const response = await app.request(
      "http://example.com/api/v1/health",
      {
        headers: { Origin: "https://evil.example" },
      },
      withEnv({
        ENVIRONMENT: AppEnvironment.DEV,
        CORS_ORIGINS: "http://localhost:5174",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe(
      "https://evil.example",
    );
  });

  it("returns 503 when production CORS_ORIGINS is empty", async () => {
    const response = await app.request(
      "http://example.com/api/v1/health",
      {},
      withEnv({
        ENVIRONMENT: AppEnvironment.PRODUCTION,
        CORS_ORIGINS: "",
      }),
    );

    expect(response.status).toBe(503);
    const body: unknown = await response.json();
    expect(body).toEqual({
      error: "Service Unavailable",
      requestId: expect.any(String),
    });
  });

  it("returns 503 when staging CORS_ORIGINS is empty", async () => {
    const response = await app.request(
      "http://example.com/api/v1/health",
      {},
      withEnv({
        ENVIRONMENT: AppEnvironment.STAGING,
        CORS_ORIGINS: "",
      }),
    );

    expect(response.status).toBe(503);
  });

  it("does not block CORS preflight OPTIONS", async () => {
    const response = await app.request(
      "http://example.com/api/v1/health",
      {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5174",
          "Access-Control-Request-Method": "GET",
        },
      },
      withEnv({
        ENVIRONMENT: AppEnvironment.DEV,
        CORS_ORIGINS: "http://localhost:5174",
      }),
    );

    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5174",
    );
  });

  it("allows JSON POST from an allowlisted Origin", async () => {
    const response = await app.request(
      "http://example.com/api/v1/health",
      {
        method: "POST",
        headers: {
          Origin: "http://localhost:5174",
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "cross-site",
        },
        body: "{}",
      },
      withEnv({
        ENVIRONMENT: AppEnvironment.DEV,
        CORS_ORIGINS: "http://localhost:5174",
      }),
    );

    // No POST handler → 404 Method Not Allowed or 404, but not CSRF 403.
    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(503);
  });

  it("rejects JSON POST from a disallowed Origin", async () => {
    const response = await app.request(
      "http://example.com/api/v1/health",
      {
        method: "POST",
        headers: {
          Origin: "https://evil.example",
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "cross-site",
        },
        body: "{}",
      },
      withEnv({
        ENVIRONMENT: AppEnvironment.DEV,
        CORS_ORIGINS: "http://localhost:5174",
      }),
    );

    expect(response.status).toBe(403);
    const body: unknown = await response.json();
    expect(body).toEqual({
      error: "Forbidden",
      requestId: expect.any(String),
    });
  });

  it("rejects unsafe JSON POST with no Origin or Sec-Fetch-Site", async () => {
    const response = await app.request(
      "http://example.com/api/v1/health",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{}",
      },
      withEnv({
        ENVIRONMENT: AppEnvironment.DEV,
        CORS_ORIGINS: "http://localhost:5174",
      }),
    );

    expect(response.status).toBe(403);
  });
});
