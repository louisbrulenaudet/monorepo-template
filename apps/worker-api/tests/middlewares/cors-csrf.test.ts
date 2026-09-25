import { AppEnvironment } from "@repo/enums-common";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import app from "../../src/index";

void app;

const HEALTH_URL = "http://example.com/api/v1/health";
const SPA_ORIGIN = "http://localhost:5174";
const PREVIEW_ORIGIN = "https://pr-7-front-app-production.acme.workers.dev";

const devEnv = {
  ...env,
  ENVIRONMENT: AppEnvironment.DEV,
  CORS_ORIGINS: SPA_ORIGIN,
};
const previewEnv = {
  ...env,
  ENVIRONMENT: AppEnvironment.PREVIEW,
  CORS_ORIGINS: "https://*-front-app-production.acme.workers.dev",
};

const ALLOWED_ORIGINS = [
  { name: "an allowlisted Origin", origin: SPA_ORIGIN, bindings: devEnv },
  {
    name: "a preview Origin matching a wildcard entry",
    origin: PREVIEW_ORIGIN,
    bindings: previewEnv,
  },
];

function jsonPost(headers: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: "{}",
  };
}

describe("CORS and CSRF middleware", () => {
  it("sets a locked-down CSP and Permissions-Policy on API responses", async () => {
    const response = await exports.default.fetch(new Request(HEALTH_URL));

    expect(response.status).toBe(200);
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
      HEALTH_URL,
      { headers: { Origin: SPA_ORIGIN } },
      devEnv,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      SPA_ORIGIN,
    );
    expect(response.headers.get("Access-Control-Expose-Headers")).toContain(
      "X-Request-Id",
    );
  });

  it("does not reflect a disallowed Origin", async () => {
    const response = await app.request(
      HEALTH_URL,
      { headers: { Origin: "https://evil.example" } },
      devEnv,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("returns 503 when production CORS_ORIGINS is empty", async () => {
    const response = await app.request(
      HEALTH_URL,
      {},
      { ...env, ENVIRONMENT: AppEnvironment.PRODUCTION, CORS_ORIGINS: "" },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Service Unavailable",
      requestId: expect.any(String),
    });
  });

  it("returns 503 when production CORS_ORIGINS holds a wildcard, even for a matching Origin", async () => {
    const response = await app.request(
      HEALTH_URL,
      { headers: { Origin: PREVIEW_ORIGIN } },
      { ...previewEnv, ENVIRONMENT: AppEnvironment.PRODUCTION },
    );

    expect(response.status).toBe(503);
  });

  it.each(ALLOWED_ORIGINS)(
    "answers the CORS preflight for $name",
    async ({ origin, bindings }) => {
      const response = await app.request(
        HEALTH_URL,
        {
          method: "OPTIONS",
          headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
        },
        bindings,
      );

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    },
  );

  it.each(ALLOWED_ORIGINS)(
    "lets a cross-site JSON POST from $name through the CSRF gate",
    async ({ origin, bindings }) => {
      const response = await app.request(
        HEALTH_URL,
        jsonPost({ Origin: origin, "Sec-Fetch-Site": "cross-site" }),
        bindings,
      );

      expect(response.status).toBe(405);
    },
  );

  it.each([
    {
      name: "a disallowed Origin",
      headers: {
        Origin: "https://evil.example",
        "Sec-Fetch-Site": "cross-site",
      },
    },
    { name: "no Origin or Sec-Fetch-Site", headers: {} },
  ])("rejects a JSON POST with $name", async ({ headers }) => {
    const response = await app.request(HEALTH_URL, jsonPost(headers), devEnv);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Forbidden",
      requestId: expect.any(String),
    });
  });
});
