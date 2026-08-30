import { EchoResponseSchema } from "@repo/dtos-common/api";
import { AppEnvironment } from "@repo/enums-common";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
// Side-effect import so Vitest re-runs when the Worker entry changes.
import app from "../../src/index";

void app;

function echoRequest(body: unknown, search = "") {
  return new Request(`http://example.com/api/v1/echo${search}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5174",
    },
    body: JSON.stringify(body),
  });
}

function badRequest(issues: { path: string; message: string }[]) {
  return { error: "Bad Request", requestId: expect.any(String), issues };
}

describe("POST /api/v1/echo", () => {
  it("echoes a valid message against the shared contract", async () => {
    const response = await exports.default.fetch(
      echoRequest({ message: "hello" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const requestId = response.headers.get("X-Request-Id");
    expect(requestId).toBeTruthy();

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

  it("rejects an empty message with a field-level issue", async () => {
    const response = await exports.default.fetch(echoRequest({ message: "" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      badRequest([{ path: "message", message: "message must not be empty" }]),
    );
  });

  it("rejects a missing message", async () => {
    const response = await exports.default.fetch(echoRequest({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      badRequest([
        {
          path: "message",
          message: "message is required and must be a string",
        },
      ]),
    );
  });

  it("rejects an unknown key in the body", async () => {
    const response = await exports.default.fetch(
      echoRequest({ message: "hello", nope: 1 }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      badRequest([{ path: "", message: "unexpected field in request body" }]),
    );
  });

  it("rejects an invalid uppercase query value", async () => {
    const response = await exports.default.fetch(
      echoRequest({ message: "hello" }, "?uppercase=yes"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      badRequest([
        { path: "uppercase", message: 'uppercase must be "true" or "false"' },
      ]),
    );
  });

  it("rejects the query before reading the body when both are invalid", async () => {
    const response = await exports.default.fetch(
      echoRequest({ message: "" }, "?uppercase=yes"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      badRequest([
        { path: "uppercase", message: 'uppercase must be "true" or "false"' },
      ]),
    );
  });

  it("does not exist in production", async () => {
    const response = await app.request(
      "http://example.com/api/v1/echo",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://app.example.com",
        },
        body: JSON.stringify({ message: "hello" }),
      },
      {
        ...env,
        ENVIRONMENT: AppEnvironment.PRODUCTION,
        CORS_ORIGINS: "https://app.example.com",
      },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Not Found",
      requestId: expect.any(String),
    });
  });

  it("still serves health in production", async () => {
    const response = await app.request(
      "http://example.com/api/v1/health",
      {},
      {
        ...env,
        ENVIRONMENT: AppEnvironment.PRODUCTION,
        CORS_ORIGINS: "https://app.example.com",
      },
    );

    expect(response.status).toBe(200);
  });

  it("is refused by the CSRF gate before validation when Origin is absent", async () => {
    const response = await exports.default.fetch(
      new Request("http://example.com/api/v1/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Forbidden",
      requestId: expect.any(String),
    });
  });
});
