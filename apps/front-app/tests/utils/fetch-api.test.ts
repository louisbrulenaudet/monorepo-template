import { CorsExposedHeader } from "@repo/enums-common";
import { describe, expect, it } from "vitest";
import * as z from "zod/mini";
import { fetchJsonWithSchema } from "#/utils/fetch-api";
import { stubFetchJson } from "../helpers/fetch-stub";

const SAMPLE_URL = "http://example.com/sample";
const SampleSchema = z.object({ ok: z.literal(true) });

describe("fetchJsonWithSchema", () => {
  it("rejects a body that does not match the schema", async () => {
    stubFetchJson({ ok: false });

    await expect(
      fetchJsonWithSchema(SAMPLE_URL, SampleSchema),
    ).rejects.toBeInstanceOf(z.core.$ZodError);
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
