import { describe, expect, it, vi } from "vitest";
import {
  getOrCreateOpaqueRequestId,
  isOpaqueRequestId,
} from "#/utils/opaque-request-id";
import { installSessionStorageHooks } from "../helpers/session-storage-mock";

installSessionStorageHooks();

describe("isOpaqueRequestId", () => {
  it("accepts UUID v4", () => {
    expect(isOpaqueRequestId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
  });

  it("rejects privileged-looking values", () => {
    expect(isOpaqueRequestId("matter-123")).toBe(false);
    expect(isOpaqueRequestId("")).toBe(false);
  });
});

describe("getOrCreateOpaqueRequestId", () => {
  it("reuses a stored opaque id for the session", () => {
    const first = getOrCreateOpaqueRequestId();
    const second = getOrCreateOpaqueRequestId();
    expect(first).toBe(second);
    expect(isOpaqueRequestId(first)).toBe(true);
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

    const first = getOrCreateOpaqueRequestId();
    const second = getOrCreateOpaqueRequestId();
    expect(first).toBe(second);
    expect(isOpaqueRequestId(first)).toBe(true);
  });
});
