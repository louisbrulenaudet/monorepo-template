import {
  isOpaqueCorrelationId,
  resolveCorrelationId,
} from "@repo/correlation-id";
import { describe, expect, it } from "vitest";

describe("correlation id", () => {
  it("accepts UUID v4 and rejects other values", () => {
    expect(isOpaqueCorrelationId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
    expect(isOpaqueCorrelationId("client-matter-9")).toBe(false);
  });

  it("preserves a valid incoming id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(resolveCorrelationId(id)).toBe(id);
  });

  it("mints a new id when incoming is missing or unsafe", () => {
    const minted = resolveCorrelationId("matter-1");
    expect(isOpaqueCorrelationId(minted)).toBe(true);
    expect(minted).not.toBe("matter-1");
  });
});
