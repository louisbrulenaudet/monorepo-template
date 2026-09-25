import { CorsAllowedHeader } from "@repo/enums-common";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod/mini";
import { getOrCreateCorrelationId } from "#/utils/correlation-id";
import { fetchJsonWithSchema } from "#/utils/fetch-api";
import { stubFetchJson } from "../helpers/fetch-stub";
import { installSessionStorageHooks } from "../helpers/session-storage-mock";

const SAMPLE_URL = "http://example.com/sample";
const SampleSchema = z.object({ ok: z.literal(true) });
const NO_DEDUPE = { dedupe: false, timeoutMs: 0 };

installSessionStorageHooks();

describe("fetchJsonWithSchema", () => {
  it("rejects a body that does not match the schema", async () => {
    stubFetchJson({ ok: false });

    await expect(
      fetchJsonWithSchema(SAMPLE_URL, SampleSchema, NO_DEDUPE),
    ).rejects.toBeInstanceOf(z.core.$ZodError);
  });

  it("sends the session correlation id as X-Request-Id", async () => {
    const fetchMock = stubFetchJson({ ok: true });

    await fetchJsonWithSchema(SAMPLE_URL, SampleSchema, NO_DEDUPE);

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get(CorsAllowedHeader.X_REQUEST_ID)).toBe(
      getOrCreateCorrelationId(),
    );
  });

  it("throws FetchApiError with the gateway request id when the response is not ok", async () => {
    const requestId = "550e8400-e29b-41d4-a716-446655440000";
    stubFetchJson(
      { error: "boom" },
      {
        status: 500,
        statusText: "Error",
        headers: { [CorsAllowedHeader.X_REQUEST_ID]: requestId },
      },
    );

    await expect(
      fetchJsonWithSchema(SAMPLE_URL, SampleSchema, NO_DEDUPE),
    ).rejects.toMatchObject({
      name: "FetchApiError",
      status: 500,
      statusText: "Error",
      requestId,
    });
  });

  it("dedupes concurrent GET requests for the same URL", async () => {
    let resolveResponse!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>(() => pending);
    vi.stubGlobal("fetch", fetchMock);

    const first = fetchJsonWithSchema(SAMPLE_URL, SampleSchema, {
      timeoutMs: 0,
    });
    const second = fetchJsonWithSchema(SAMPLE_URL, SampleSchema, {
      timeoutMs: 0,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    resolveResponse(Response.json({ ok: true }));
    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
  });
});
