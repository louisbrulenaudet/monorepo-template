import {
  AppEnvironment,
  allowsWildcardCorsOrigins,
  isStrictCorsAppEnvironment,
} from "@repo/enums-common";
import { describe, expect, it } from "vitest";
import {
  isAllowedCorsOrigin,
  parseCorsOrigins,
  resolveCorsOrigins,
} from "../../src/middlewares/cors-origins";

const PREVIEW_PATTERN = "https://*-front-app-production.acme.workers.dev";

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
    expect(isStrictCorsAppEnvironment(AppEnvironment.PREVIEW)).toBe(true);
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

  it("fails closed when preview has an empty allowlist", () => {
    expect(resolveCorsOrigins(AppEnvironment.PREVIEW, "")).toEqual({
      ok: false,
      reason: "missing_allowlist",
    });
  });

  it("accepts a wildcard entry in preview only", () => {
    expect(resolveCorsOrigins(AppEnvironment.PREVIEW, PREVIEW_PATTERN)).toEqual(
      { ok: true, origins: [PREVIEW_PATTERN] },
    );
    for (const environment of [
      AppEnvironment.DEV,
      AppEnvironment.STAGING,
      AppEnvironment.PRODUCTION,
    ]) {
      expect(resolveCorsOrigins(environment, PREVIEW_PATTERN)).toEqual({
        ok: false,
        reason: "wildcard_not_allowed",
      });
    }
  });

  it("rejects malformed wildcard entries", () => {
    for (const pattern of [
      "http://*-front-app.acme.workers.dev",
      "https://front-*.acme.workers.dev",
      "https://*.*.workers.dev",
      "https://*",
      "https://*-front-app.acme.workers.dev:8443",
      "https://*-front-app.acme.workers.dev/path",
      "https://*.com",
      "https://*.workers.dev",
      "https://*-front-app.workers.dev",
    ]) {
      expect(resolveCorsOrigins(AppEnvironment.PREVIEW, pattern)).toEqual({
        ok: false,
        reason: "invalid_wildcard",
      });
    }
  });
});

describe("allowsWildcardCorsOrigins", () => {
  it("is true only for preview", () => {
    expect(allowsWildcardCorsOrigins(AppEnvironment.PREVIEW)).toBe(true);
    expect(allowsWildcardCorsOrigins(AppEnvironment.DEV)).toBe(false);
    expect(allowsWildcardCorsOrigins(AppEnvironment.STAGING)).toBe(false);
    expect(allowsWildcardCorsOrigins(AppEnvironment.PRODUCTION)).toBe(false);
  });
});

describe("isAllowedCorsOrigin", () => {
  it.each([
    ["https://app.example.com", ["https://app.example.com"], true],
    ["https://app.example.com.evil", ["https://app.example.com"], false],
    [
      "https://pr-12-front-app-production.acme.workers.dev",
      [PREVIEW_PATTERN],
      true,
    ],
    [
      "https://evil.pr-12-front-app-production.acme.workers.dev",
      [PREVIEW_PATTERN],
      false,
    ],
    [
      "https://-front-app-production.acme.workers.dev",
      [PREVIEW_PATTERN],
      false,
    ],
    [
      "http://pr-12-front-app-production.acme.workers.dev",
      [PREVIEW_PATTERN],
      false,
    ],
    [
      "https://pr-12-front-app-production.other.workers.dev",
      [PREVIEW_PATTERN],
      false,
    ],
  ])("%s against %j is %s", (origin, allowed, expected) => {
    expect(isAllowedCorsOrigin(origin, allowed)).toBe(expected);
  });
});
