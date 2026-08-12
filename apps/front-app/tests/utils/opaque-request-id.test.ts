import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOrCreateOpaqueRequestId,
  isOpaqueRequestId,
} from "#/utils/opaque-request-id";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => {
      memory.clear();
    },
    key: () => null,
    get length() {
      return memory.size;
    },
  } satisfies Storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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
});
