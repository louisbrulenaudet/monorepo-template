import { describe, expect, it } from "vitest";
import { isOpaqueCorrelationId, resolveCorrelationId } from "../src/index";

describe("isOpaqueCorrelationId", () => {
  it("accepts UUID v4 and rejects other values", () => {
    expect(isOpaqueCorrelationId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
    expect(isOpaqueCorrelationId("client-matter-9")).toBe(false);
  });

  it("rejects UUID versions other than v4", () => {
    expect(isOpaqueCorrelationId("550e8400-e29b-11d4-a716-446655440000")).toBe(
      false,
    );
  });
});

describe("resolveCorrelationId", () => {
  it("preserves a valid incoming id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(resolveCorrelationId(id)).toBe(id);
  });

  it("mints a new opaque id when incoming is missing or unsafe", () => {
    for (const incoming of [undefined, "matter-1"]) {
      const minted = resolveCorrelationId(incoming);
      expect(isOpaqueCorrelationId(minted)).toBe(true);
      expect(minted).not.toBe(incoming);
    }
  });
});
