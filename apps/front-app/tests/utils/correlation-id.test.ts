import { describe, expect, it, vi } from "vitest";
import {
  getOrCreateCorrelationId,
  isOpaqueCorrelationId,
} from "#/utils/correlation-id";
import { installSessionStorageHooks } from "../helpers/session-storage-mock";

installSessionStorageHooks();

describe("isOpaqueCorrelationId", () => {
  it("accepts UUID v4", () => {
    expect(isOpaqueCorrelationId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
  });

  it("rejects privileged-looking values", () => {
    expect(isOpaqueCorrelationId("matter-123")).toBe(false);
    expect(isOpaqueCorrelationId("")).toBe(false);
  });
});

describe("getOrCreateCorrelationId", () => {
  it("reuses a stored opaque id for the session", () => {
    const first = getOrCreateCorrelationId();
    const second = getOrCreateCorrelationId();
    expect(first).toBe(second);
    expect(isOpaqueCorrelationId(first)).toBe(true);
  });

  it("keeps a stable id when sessionStorage is blocked", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
      clear: () => {
        throw new Error("blocked");
      },
      key: () => null,
      length: 0,
    } satisfies Storage);

    const first = getOrCreateCorrelationId();
    const second = getOrCreateCorrelationId();
    expect(first).toBe(second);
    expect(isOpaqueCorrelationId(first)).toBe(true);
  });
});
