import { CorsAllowedHeader } from "@repo/enums-common";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod/mini";
import { FetchApiError, fetchJsonWithSchema } from "#/utils/fetch-api";
import { installSessionStorageHooks } from "../helpers/session-storage-mock";

const SampleSchema = z.object({
  ok: z.literal(true),
});

installSessionStorageHooks();

describe("fetchJsonWithSchema", () => {
  it("parses a successful JSON response with the given schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<() => Promise<Response>>(() =>
        Promise.resolve(
          Response.json({ ok: true }, { status: 200, statusText: "OK" }),
        ),
      ),
    );

    await expect(
      fetchJsonWithSchema("http://example.com/sample", SampleSchema, {
        dedupe: false,
        timeoutMs: 0,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("sends an opaque X-Request-Id on every call", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({ ok: true }, { status: 200, statusText: "OK" }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchJsonWithSchema("http://example.com/sample", SampleSchema, {
      dedupe: false,
      timeoutMs: 0,
    });

    expect(fetchMock).toHaveBeenCalled();
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    const requestId = headers.get(CorsAllowedHeader.X_REQUEST_ID);
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("throws FetchApiError when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<() => Promise<Response>>(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "boom" }), {
            status: 500,
            statusText: "Error",
            headers: {
              "Content-Type": "application/json",
              [CorsAllowedHeader.X_REQUEST_ID]:
                "550e8400-e29b-41d4-a716-446655440000",
            },
          }),
        ),
      ),
    );

    const error = await fetchJsonWithSchema(
      "http://example.com/sample",
      SampleSchema,
      {
        dedupe: false,
        timeoutMs: 0,
      },
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FetchApiError);
    expect(error).toMatchObject({
      message: "Request failed: 500 Error",
      status: 500,
      statusText: "Error",
      requestId: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("dedupes concurrent GET requests for the same URL", async () => {
    let resolveResponse!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>(() => pending);
    vi.stubGlobal("fetch", fetchMock);

    const first = fetchJsonWithSchema(
      "http://example.com/sample",
      SampleSchema,
      {
        timeoutMs: 0,
      },
    );
    const second = fetchJsonWithSchema(
      "http://example.com/sample",
      SampleSchema,
      {
        timeoutMs: 0,
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveResponse(
      Response.json({ ok: true }, { status: 200, statusText: "OK" }),
    );

    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
  });
});
