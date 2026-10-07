import { CorsExposedHeader } from "@repo/enums-common";
import { describe, expect, it } from "vitest";
import * as z from "zod/mini";
import { fetchJsonWithSchema, ResponseSchemaError } from "#/utils/fetch-api";
import { stubFetchJson } from "../helpers/fetch-stub";

const SAMPLE_URL = "http://example.com/sample";
const SampleSchema = z.object({ ok: z.literal(true) });

describe("fetchJsonWithSchema", () => {
  it("returns the parsed body with the gateway request id", async () => {
    const requestId = "550e8400-e29b-41d4-a716-446655440000";
    stubFetchJson(
      { ok: true },
      { headers: { [CorsExposedHeader.X_REQUEST_ID]: requestId } },
    );

    await expect(
      fetchJsonWithSchema(SAMPLE_URL, SampleSchema),
    ).resolves.toEqual({ data: { ok: true }, requestId });
  });

  it("throws ResponseSchemaError with the gateway request id and the Zod issues when the body does not match the schema", async () => {
    const requestId = "550e8400-e29b-41d4-a716-446655440000";
    stubFetchJson(
      { ok: false },
      { headers: { [CorsExposedHeader.X_REQUEST_ID]: requestId } },
    );

    const error: unknown = await fetchJsonWithSchema(
      SAMPLE_URL,
      SampleSchema,
    ).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ResponseSchemaError);
    expect(error).toMatchObject({
      requestId,
      cause: expect.any(z.core.$ZodError),
    });
  });

  it("throws FetchApiError with the gateway request id when the response is not ok", async () => {
    const requestId = "550e8400-e29b-41d4-a716-446655440000";
    stubFetchJson(
      { error: "boom" },
      {
        status: 500,
        statusText: "Error",
        headers: { [CorsExposedHeader.X_REQUEST_ID]: requestId },
      },
    );

    await expect(
      fetchJsonWithSchema(SAMPLE_URL, SampleSchema),
    ).rejects.toMatchObject({
      name: "FetchApiError",
      status: 500,
      statusText: "Error",
      requestId,
    });
  });
});
