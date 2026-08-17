import { AppEnvironment, isStrictCorsAppEnvironment } from "@repo/enums-common";
import { describe, expect, it } from "vitest";
import {
  parseCorsOrigins,
  resolveCorsOrigins,
} from "../../src/middlewares/cors-origins";

describe("parseCorsOrigins", () => {
  it("returns null for empty or whitespace values", () => {
    expect(parseCorsOrigins(undefined)).toBeNull();
    expect(parseCorsOrigins("")).toBeNull();
    expect(parseCorsOrigins("   ")).toBeNull();
  });

  it("splits and trims a comma-separated allowlist", () => {
    expect(
      parseCorsOrigins("https://app.example.com, http://localhost:5174"),
    ).toEqual(["https://app.example.com", "http://localhost:5174"]);
  });
});

describe("isStrictCorsAppEnvironment", () => {
  it("is permissive only for explicit dev", () => {
    expect(isStrictCorsAppEnvironment(AppEnvironment.DEV)).toBe(false);
    expect(isStrictCorsAppEnvironment(AppEnvironment.STAGING)).toBe(true);
    expect(isStrictCorsAppEnvironment(AppEnvironment.PRODUCTION)).toBe(true);
    expect(isStrictCorsAppEnvironment("prod")).toBe(true);
    expect(isStrictCorsAppEnvironment("")).toBe(true);
  });
});

describe("resolveCorsOrigins", () => {
  it("allows permissive null in dev", () => {
    expect(resolveCorsOrigins(AppEnvironment.DEV, "")).toEqual({
      ok: true,
      origins: null,
    });
  });

  it("fails closed when staging or production has an empty allowlist", () => {
    expect(resolveCorsOrigins(AppEnvironment.STAGING, "")).toEqual({
      ok: false,
      reason: "missing_allowlist",
    });
    expect(resolveCorsOrigins(AppEnvironment.PRODUCTION, undefined)).toEqual({
      ok: false,
      reason: "missing_allowlist",
    });
  });

  it("fails closed when ENVIRONMENT is unrecognized and allowlist is empty", () => {
    expect(resolveCorsOrigins("prod", "")).toEqual({
      ok: false,
      reason: "missing_allowlist",
    });
  });

  it("returns the allowlist when set in production", () => {
    expect(
      resolveCorsOrigins(AppEnvironment.PRODUCTION, "https://app.example.com"),
    ).toEqual({
      ok: true,
      origins: ["https://app.example.com"],
    });
  });
});
