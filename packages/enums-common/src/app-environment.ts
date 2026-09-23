export const AppEnvironment = {
  DEV: "dev",
  STAGING: "staging",
  PRODUCTION: "production",
  PREVIEW: "preview",
} as const;

export type AppEnvironment =
  (typeof AppEnvironment)[keyof typeof AppEnvironment];

export function isStrictCorsAppEnvironment(environment: string): boolean {
  return environment !== AppEnvironment.DEV;
}

export function allowsWildcardCorsOrigins(environment: string): boolean {
  return environment === AppEnvironment.PREVIEW;
}
