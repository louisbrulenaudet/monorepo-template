import { CorsAllowedHeader } from "@repo/enums-common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonWithSchema } from "#/utils/fetch-api";

const SampleSchema = {
  parse(value: unknown): { ok: true } {
    if (
      typeof value === "object" &&
      value !== null &&
      "ok" in value &&
      value.ok === true
    ) {
      return { ok: true };
    }
    throw new Error("invalid sample payload");
  },
};

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => {
      memory.clear();
    },
    key: () => null,
    get length() {
      return memory.size;
    },
  } satisfies Storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<() => Promise<Response>>(() =>
        Promise.resolve(
          Response.json(
            { error: "boom" },
            { status: 500, statusText: "Error" },
          ),
        ),
      ),
    );

    await expect(
      fetchJsonWithSchema("http://example.com/sample", SampleSchema, {
        dedupe: false,
        timeoutMs: 0,
      }),
    ).rejects.toThrow("Request failed: 500 Error");
  });
});
