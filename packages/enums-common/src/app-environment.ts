export const AppEnvironment = {
  DEV: "dev",
  STAGING: "staging",
  PRODUCTION: "production",
} as const;

export type AppEnvironment =
  (typeof AppEnvironment)[keyof typeof AppEnvironment];

/**
 * Empty `CORS_ORIGINS` is permissive only for explicit `AppEnvironment.DEV`.
 * Staging, production, typos (`prod`), and any other value fail closed.
 */
export function isStrictCorsAppEnvironment(environment: string): boolean {
  return environment !== AppEnvironment.DEV;
}
