import { AppEnvironment, parseAppEnvironment } from "@repo/enums-common";

const DEFAULT_API_BASE_URL = import.meta.env.DEV ? "http://localhost:8700" : "";
const DEFAULT_APP_ENVIRONMENT = import.meta.env.DEV
  ? AppEnvironment.DEV
  : AppEnvironment.PRODUCTION;

function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value.length === 0 ? undefined : value;
}

export const apiBaseUrl =
  nonEmpty(import.meta.env.VITE_API_BASE_URL) ?? DEFAULT_API_BASE_URL;

export const appEnvironment =
  parseAppEnvironment(import.meta.env.VITE_APP_ENVIRONMENT ?? "") ??
  DEFAULT_APP_ENVIRONMENT;
