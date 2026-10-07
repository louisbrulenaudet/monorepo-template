import { describe, expect, it } from "vitest";
import { getClientSafeErrorDetails } from "#/utils/client-safe-error";
import { FetchApiError, ResponseSchemaError } from "#/utils/fetch-api";

describe("getClientSafeErrorDetails", () => {
  it("does not echo raw Error.message", () => {
    const details = getClientSafeErrorDetails(
      new Error("SELECT * FROM users WHERE email = secret"),
    );

    expect(details.message).not.toContain("users");
    expect(details.message).not.toContain("secret");
    expect(details.requestId).toBeNull();
  });

  it("surfaces FetchApiError requestId without status text leakage", () => {
    const details = getClientSafeErrorDetails(
      new FetchApiError(502, "Bad Gateway from upstream cluster", "req-uuid"),
    );

    expect(details.message).not.toContain("upstream");
    expect(details.requestId).toBe("req-uuid");
  });

  it("surfaces ResponseSchemaError requestId without the schema issues", () => {
    const details = getClientSafeErrorDetails(
      new ResponseSchemaError("req-schema", new Error("expected secret_field")),
    );

    expect(details.message).not.toContain("secret_field");
    expect(details.requestId).toBe("req-schema");
  });
});
