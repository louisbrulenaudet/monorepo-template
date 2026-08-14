export const AppEnvironment = {
  DEV: "dev",
  STAGING: "staging",
  PRODUCTION: "production",
} as const;

export type AppEnvironment =
  (typeof AppEnvironment)[keyof typeof AppEnvironment];

const APP_ENVIRONMENT_LOOKUP = new Map<string, AppEnvironment>(
  Object.values(AppEnvironment).map((value) => [value, value]),
);

/**
 * Staging and production — never fall back to permissive CORS / CSRF. Local
 * `dev` may use an empty allowlist.
 */
export const STRICT_CORS_APP_ENVIRONMENTS: readonly AppEnvironment[] = [
  AppEnvironment.STAGING,
  AppEnvironment.PRODUCTION,
];

const STRICT_CORS_LOOKUP = new Set<string>(STRICT_CORS_APP_ENVIRONMENTS);

export function parseAppEnvironment(value: string): AppEnvironment | undefined {
  return APP_ENVIRONMENT_LOOKUP.get(value);
}

export function isStrictCorsAppEnvironment(environment: string): boolean {
  return STRICT_CORS_LOOKUP.has(environment);
}
