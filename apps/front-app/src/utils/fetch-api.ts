import { CorsExposedHeader } from "@repo/enums-common";

const DEFAULT_TIMEOUT_MS = 20_000;

type ResponseSchema<T> = {
  safeParse: (
    data: unknown,
  ) => { success: true; data: T } | { success: false; error: Error };
};

export type FetchJsonOptions = {
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

export class ResponseSchemaError extends Error {
  readonly requestId: string | null;

  constructor(requestId: string | null, cause: Error) {
    super("Response body does not match its schema", { cause });
    this.name = "ResponseSchemaError";
    this.requestId = requestId;
  }
}

export type FetchJsonResult<T> = {
  data: T;
  requestId: string | null;
};

export async function fetchJsonWithSchema<T>(
  url: string,
  schema: ResponseSchema<T>,
  options?: FetchJsonOptions,
): Promise<FetchJsonResult<T>> {
  const timeoutSignal = AbortSignal.timeout(
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const res = await fetch(url, {
    signal: options?.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal,
  });

  const requestId = res.headers.get(CorsExposedHeader.X_REQUEST_ID);
  if (!res.ok) {
    throw new FetchApiError(res.status, res.statusText, requestId);
  }

  const json: unknown = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ResponseSchemaError(requestId, parsed.error);
  }
  return { data: parsed.data, requestId };
}
