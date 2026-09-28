import { CorsExposedHeader } from "@repo/enums-common";

const DEFAULT_TIMEOUT_MS = 20_000;

type SchemaWithParse<T> = {
  parse: (data: unknown) => T;
};

type FetchJsonOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export class FetchApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly requestId: string | null;

  constructor(
    status: number,
    statusText: string,
    requestId: string | null = null,
  ) {
    super(`Request failed: ${status} ${statusText}`);
    this.name = "FetchApiError";
    this.status = status;
    this.statusText = statusText;
    this.requestId = requestId;
  }
}

export async function fetchJsonWithSchema<T>(
  url: string,
  schema: SchemaWithParse<T>,
  options?: FetchJsonOptions,
): Promise<T> {
  const timeoutSignal = AbortSignal.timeout(
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const res = await fetch(url, {
    signal: options?.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal,
  });

  if (!res.ok) {
    throw new FetchApiError(
      res.status,
      res.statusText,
      res.headers.get(CorsExposedHeader.X_REQUEST_ID),
    );
  }

  const json: unknown = await res.json();
  return schema.parse(json);
}
