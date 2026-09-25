import { isOpaqueCorrelationId } from "@repo/correlation-id";
import { describe, expect, it, vi } from "vitest";
import {
  getOrCreateCorrelationId,
  resetCorrelationIdCache,
} from "#/utils/correlation-id";
import { installSessionStorageHooks } from "../helpers/session-storage-mock";

function throwBlocked(): never {
  throw new Error("blocked");
}

installSessionStorageHooks();

describe("getOrCreateCorrelationId", () => {
  it("reuses the id stored for the session", () => {
    const first = getOrCreateCorrelationId();
    resetCorrelationIdCache();

    expect(first).toSatisfy(isOpaqueCorrelationId);
    expect(getOrCreateCorrelationId()).toBe(first);
  });

  it("replaces a stored value that is not an opaque id", () => {
    vi.spyOn(sessionStorage, "getItem").mockReturnValue("matter-123");

    expect(getOrCreateCorrelationId()).toSatisfy(isOpaqueCorrelationId);
  });

  it("keeps a stable id when sessionStorage is blocked", () => {
    vi.spyOn(sessionStorage, "getItem").mockImplementation(throwBlocked);
    vi.spyOn(sessionStorage, "setItem").mockImplementation(throwBlocked);

    const first = getOrCreateCorrelationId();
    expect(first).toSatisfy(isOpaqueCorrelationId);
    expect(getOrCreateCorrelationId()).toBe(first);
  });
});
