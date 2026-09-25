import { CancelledError } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createQueryClient } from "#/config/query-client";
import { FetchApiError } from "#/utils/fetch-api";

function setup() {
  const reportError = vi.fn<(error: unknown) => void>();
  return { client: createQueryClient(reportError), reportError };
}

async function failQuery(error: Error) {
  const { client, reportError } = setup();
  await expect(
    client.query({
      queryKey: ["failing"],
      queryFn: (): never => {
        throw error;
      },
    }),
  ).rejects.toBe(error);
  return reportError;
}

describe("createQueryClient error reporting", () => {
  it("reports an unexpected query error", async () => {
    const error = new TypeError("Failed to parse response");
    const reportError = await failQuery(error);
    expect(reportError).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("leaves HTTP error responses to worker-api", async () => {
    const reportError = await failQuery(
      new FetchApiError(503, "Service Unavailable"),
    );
    expect(reportError).not.toHaveBeenCalled();
  });

  it("ignores cancelled queries", async () => {
    const reportError = await failQuery(new CancelledError());
    expect(reportError).not.toHaveBeenCalled();
  });

  it("reports an unexpected mutation error", async () => {
    const { client, reportError } = setup();
    const error = new Error("boom");
    const mutation = client.getMutationCache().build(client, {
      mutationFn: (): never => {
        throw error;
      },
    });
    await expect(mutation.execute(undefined)).rejects.toBe(error);
    expect(reportError).toHaveBeenCalledExactlyOnceWith(error);
  });
});
