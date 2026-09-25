import { AppEnvironment } from "@repo/enums-common";
import { describe, expect, it } from "vitest";
import {
  isAllowedCorsOrigin,
  resolveCorsOrigins,
} from "../../src/middlewares/cors-origins";

const PREVIEW_PATTERN = "https://*-front-app-production.acme.workers.dev";

describe("resolveCorsOrigins", () => {
  it("allows permissive null in dev", () => {
    expect(resolveCorsOrigins(AppEnvironment.DEV, "")).toEqual({
      ok: true,
      origins: null,
    });
  });

  it.each([
    [AppEnvironment.STAGING, ""],
    [AppEnvironment.PRODUCTION, undefined],
    [AppEnvironment.PRODUCTION, "   "],
    [AppEnvironment.PREVIEW, ""],
    ["prod", ""],
    ["", ""],
  ])("fails closed in %j with allowlist %j", (environment, corsOrigins) => {
    expect(resolveCorsOrigins(environment, corsOrigins)).toEqual({
      ok: false,
      reason: "missing_allowlist",
    });
  });

  it("returns the trimmed allowlist when set in production", () => {
    expect(
      resolveCorsOrigins(
        AppEnvironment.PRODUCTION,
        "https://app.example.com, http://localhost:5174",
      ),
    ).toEqual({
      ok: true,
      origins: ["https://app.example.com", "http://localhost:5174"],
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
