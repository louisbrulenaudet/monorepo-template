import { isOpaqueCorrelationId } from "@repo/correlation-id";
import { EchoResponseSchema } from "@repo/dtos-common/api";
import { AppEnvironment } from "@repo/enums-common";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import app from "../../src/index";

void app;

const SPA_ORIGIN = "http://localhost:5174";
const UPPERCASE_ISSUE = {
  path: "uppercase",
  message: 'uppercase must be "true" or "false"',
};
const productionEnv = {
  ...env,
  ENVIRONMENT: AppEnvironment.PRODUCTION,
  CORS_ORIGINS: "https://app.example.com",
};

function echoRequest(
  body: unknown,
  search = "",
  origin: string | null = SPA_ORIGIN,
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (origin !== null) {
    headers.set("Origin", origin);
  }
  return new Request(`http://example.com/api/v1/echo${search}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/echo", () => {
  it("echoes a valid message against the shared contract", async () => {
    const response = await exports.default.fetch(
      echoRequest({ message: "hello" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const requestId = response.headers.get("X-Request-Id");
    expect(requestId).toSatisfy(isOpaqueCorrelationId);

    const body: unknown = await response.json();
    expect(EchoResponseSchema.parse(body)).toEqual({
      message: "hello",
      receivedAt: expect.any(String),
      requestId,
    });
  });

  it("upper-cases the message when ?uppercase=true", async () => {
    const response = await exports.default.fetch(
      echoRequest({ message: "hello" }, "?uppercase=true"),
    );

    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(EchoResponseSchema.parse(body).message).toBe("HELLO");
  });

  it.each([
    {
      name: "an empty message",
      body: { message: "" },
      search: "",
      issues: [{ path: "message", message: "message must not be empty" }],
    },
    {
      name: "a missing message",
      body: {},
      search: "",
      issues: [
        {
          path: "message",
          message: "message is required and must be a string",
        },
      ],
    },
    {
      name: "an unknown body key",
      body: { message: "hello", nope: 1 },
      search: "",
      issues: [{ path: "", message: "unexpected field in request body" }],
    },
    {
      name: "an invalid uppercase query value",
      body: { message: "hello" },
      search: "?uppercase=yes",
      issues: [UPPERCASE_ISSUE],
    },
    {
      name: "an invalid query before validating the body",
      body: { message: "" },
      search: "?uppercase=yes",
      issues: [UPPERCASE_ISSUE],
    },
  ])("rejects $name", async ({ body, search, issues }) => {
    const response = await exports.default.fetch(echoRequest(body, search));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Bad Request",
      requestId: expect.any(String),
      issues,
    });
  });

  it("does not exist in production", async () => {
    const response = await app.request(
      echoRequest({ message: "hello" }, "", "https://app.example.com"),
      undefined,
      productionEnv,
    );

    expect(response.status).toBe(404);
  });

  it("still serves health in production", async () => {
    const response = await app.request(
      "http://example.com/api/v1/health",
      {},
      productionEnv,
    );

    expect(response.status).toBe(200);
  });

  it("is refused by the CSRF gate before validation when Origin is absent", async () => {
    const response = await exports.default.fetch(
      echoRequest({ message: "" }, "", null),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Forbidden",
      requestId: expect.any(String),
    });
  });
});
