import { isStrictCorsAppEnvironment } from "@repo/enums-common";

/** `null` means permissive mode (any origin) — allowed in non-strict envs only. */
export function parseCorsOrigins(value: string | undefined): string[] | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : null;
}

export type CorsOriginResolution =
  | { ok: true; origins: string[] | null }
  | { ok: false; reason: "missing_allowlist" };

/**
 * Resolve the browser-origin allowlist for CORS and CSRF. Only explicit
 * `AppEnvironment.DEV` may use `null` (= permissive `*` / allow-all). Staging,
 * production, and any other `ENVIRONMENT` with an empty list fail closed
 * (callers return 503).
 */
export function resolveCorsOrigins(
  environment: string,
  corsOrigins: string | undefined,
): CorsOriginResolution {
  const origins = parseCorsOrigins(corsOrigins);
  if (origins === null && isStrictCorsAppEnvironment(environment)) {
    return { ok: false, reason: "missing_allowlist" };
  }
  return { ok: true, origins };
}
