// src/config/env.ts

const defaultWorkerApiBaseUrl = import.meta.env.DEV
  ? "http://localhost:8725"
  : "";

export const workerApiBaseUrl =
  import.meta.env.VITE_WORKER_API_BASE_URL ?? defaultWorkerApiBaseUrl;
