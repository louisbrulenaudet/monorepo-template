import { afterEach, describe, expect, it, vi } from "vitest";
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
