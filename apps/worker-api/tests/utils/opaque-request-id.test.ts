import { describe, expect, it } from "vitest";
import {
  isOpaqueRequestId,
  resolveOpaqueRequestId,
} from "../../src/utils/opaque-request-id";

describe("opaque request id", () => {
  it("accepts UUID v4 and rejects other values", () => {
    expect(isOpaqueRequestId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
    expect(isOpaqueRequestId("client-matter-9")).toBe(false);
  });

  it("preserves a valid incoming id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(resolveOpaqueRequestId(id)).toBe(id);
  });

  it("mints a new id when incoming is missing or unsafe", () => {
    const minted = resolveOpaqueRequestId("matter-1");
    expect(isOpaqueRequestId(minted)).toBe(true);
    expect(minted).not.toBe("matter-1");
  });
});
