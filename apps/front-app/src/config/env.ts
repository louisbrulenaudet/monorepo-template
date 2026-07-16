const defaultApiBaseUrl = import.meta.env.DEV ? "http://localhost:8700" : "";

function readViteApiBaseUrl(): string | undefined {
  const value: unknown = import.meta.env["VITE_API_BASE_URL"];
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  return value;
}

export const apiBaseUrl = readViteApiBaseUrl() ?? defaultApiBaseUrl;
