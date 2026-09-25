export const AppEnvironment = {
  DEV: "dev",
  STAGING: "staging",
  PRODUCTION: "production",
  PREVIEW: "preview",
} as const;

export type AppEnvironment =
  (typeof AppEnvironment)[keyof typeof AppEnvironment];

const APP_ENVIRONMENT_LOOKUP = new Map<string, AppEnvironment>(
  Object.values(AppEnvironment).map((environment) => [
    environment,
    environment,
  ]),
);

export function parseAppEnvironment(
  environment: string,
): AppEnvironment | undefined {
  return APP_ENVIRONMENT_LOOKUP.get(environment);
}

export function isStrictCorsAppEnvironment(environment: string): boolean {
  return environment !== AppEnvironment.DEV;
}

export function allowsWildcardCorsOrigins(environment: string): boolean {
  return environment === AppEnvironment.PREVIEW;
}
