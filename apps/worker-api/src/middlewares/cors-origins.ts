import {
  allowsWildcardCorsOrigins,
  isStrictCorsAppEnvironment,
} from "@repo/enums-common";

// `https://*<rest-of-first-label>.<3+ labels>`: the `*` stays inside the first
// label, and three labels after it keep public suffixes (`*.workers.dev`, `*.co.uk`) out.
const WILDCARD_ORIGIN = /^https:\/\/\*([a-z0-9-]*(?:\.[a-z0-9-]+){3,})$/;
const WILDCARD_MATCHED_PREFIX = /^https:\/\/[a-z0-9-]+$/;

/** `null` means permissive mode (any origin) - allowed in non-strict envs only. */
function parseCorsOrigins(value: string | undefined): string[] | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : null;
}

function matchesWildcardOrigin(origin: string, pattern: string): boolean {
  const suffix = WILDCARD_ORIGIN.exec(pattern)?.[1];
  return (
    suffix !== undefined &&
    origin.endsWith(suffix) &&
    WILDCARD_MATCHED_PREFIX.test(origin.slice(0, -suffix.length))
  );
}

export function isAllowedCorsOrigin(
  origin: string,
  allowedOrigins: string[],
): boolean {
  return allowedOrigins.some((entry) =>
    entry.includes("*")
      ? matchesWildcardOrigin(origin, entry)
      : entry === origin,
  );
}

export type CorsOriginResolution =
  | { ok: true; origins: string[] | null }
  | {
      ok: false;
      reason: "missing_allowlist" | "invalid_wildcard" | "wildcard_not_allowed";
    };

/** Resolve the browser-origin allowlist for CORS and CSRF. */
export function resolveCorsOrigins(
  environment: string,
  corsOrigins: string | undefined,
): CorsOriginResolution {
  const origins = parseCorsOrigins(corsOrigins);
  if (origins === null) {
    return isStrictCorsAppEnvironment(environment)
      ? { ok: false, reason: "missing_allowlist" }
      : { ok: true, origins };
  }
  const wildcards = origins.filter((entry) => entry.includes("*"));
  if (wildcards.length > 0) {
    if (!wildcards.every((entry) => WILDCARD_ORIGIN.test(entry))) {
      return { ok: false, reason: "invalid_wildcard" };
    }
    if (!allowsWildcardCorsOrigins(environment)) {
      return { ok: false, reason: "wildcard_not_allowed" };
    }
  }
  return { ok: true, origins };
}
