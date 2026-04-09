// src/config/env.ts

const defaultApiBaseUrl = import.meta.env.DEV ? "http://localhost:8725" : "";

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl;
