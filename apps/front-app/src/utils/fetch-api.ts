import { HttpMethod } from "@repo/enums-common";

type SchemaLike<T> = {
  parse: (value: unknown) => T;
};

type FetchJsonOptions = {
  method?: Exclude<HttpMethod, typeof HttpMethod.OPTIONS>;
  headers?: HeadersInit;
  body?: BodyInit | null;
  signal?: AbortSignal;
  timeoutMs?: number;
  dedupe?: boolean;
  dedupeKey?: string;
};

const inflightGetRequests = new Map<string, Promise<unknown>>();

function resolveSignal(
  options?: Pick<FetchJsonOptions, "signal" | "timeoutMs">,
): AbortSignal | undefined {
  const parent = options?.signal;
  const timeoutMs = options?.timeoutMs ?? 8000;

  if (timeoutMs <= 0) {
    return parent;
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return parent ? AbortSignal.any([parent, timeoutSignal]) : timeoutSignal;
}

async function fetchJsonRaw(
  url: string,
  options?: FetchJsonOptions,
): Promise<unknown> {
  const method = options?.method ?? HttpMethod.GET;
  const signal = resolveSignal(options);

  const init: RequestInit = {
    method,
    body: options?.body ?? null,
    signal: signal ?? null,
  };
  if (options?.headers !== undefined) {
    init.headers = options.headers;
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as unknown;
}

export async function fetchJsonWithSchema<T>(
  url: string,
  schema: SchemaLike<T>,
  options?: FetchJsonOptions,
): Promise<T> {
  const method = options?.method ?? HttpMethod.GET;
  const dedupe = options?.dedupe ?? method === HttpMethod.GET;

  const dedupeKey = dedupe ? (options?.dedupeKey ?? `${method} ${url}`) : null;
  if (dedupeKey && inflightGetRequests.has(dedupeKey)) {
    const existing = inflightGetRequests.get(dedupeKey);
    return schema.parse(await existing);
  }

  const promise = fetchJsonRaw(url, options);

  if (dedupeKey) {
    inflightGetRequests.set(dedupeKey, promise);
  }

  try {
    const json = await promise;
    return schema.parse(json);
  } finally {
    if (dedupeKey) {
      inflightGetRequests.delete(dedupeKey);
    }
  }
}
