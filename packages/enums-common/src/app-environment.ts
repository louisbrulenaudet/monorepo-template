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
 * Known deploy targets that must set `CORS_ORIGINS`. Unknown / mistyped
 * `ENVIRONMENT` values are also strict — see `isStrictCorsAppEnvironment`.
 */
export const STRICT_CORS_APP_ENVIRONMENTS: readonly AppEnvironment[] = [
  AppEnvironment.STAGING,
  AppEnvironment.PRODUCTION,
];

export function parseAppEnvironment(value: string): AppEnvironment | undefined {
  return APP_ENVIRONMENT_LOOKUP.get(value);
}

/**
 * Empty `CORS_ORIGINS` is permissive only for explicit `AppEnvironment.DEV`.
 * Staging, production, typos (`prod`), and any other value fail closed.
 */
export function isStrictCorsAppEnvironment(environment: string): boolean {
  return environment !== AppEnvironment.DEV;
}
