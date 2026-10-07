// @vitest-environment happy-dom
import { CorsExposedHeader } from "@repo/enums-common";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StackCheck } from "#/components/health/StackCheck";
import { stubFetchJson } from "../../helpers/fetch-stub";

function healthResponse(requestId: string): Response {
  return Response.json(
    { status: "ok", version: "1.2.3" },
    { headers: { [CorsExposedHeader.X_REQUEST_ID]: requestId } },
  );
}

function renderStackCheck() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  render(
    <QueryClientProvider client={client}>
      <StackCheck />
    </QueryClientProvider>,
  );
}

describe("StackCheck", () => {
  it("shows the status chip, version, and request id of a healthy probe", async () => {
    stubFetchJson(
      { status: "ok", version: "1.2.3" },
      { headers: { [CorsExposedHeader.X_REQUEST_ID]: "req-ok" } },
    );
    renderStackCheck();

    expect(await screen.findByText("req-ok")).toBeInTheDocument();
    expect(screen.getByText("200 ok")).toBeInTheDocument();
    expect(screen.getByText("v1.2.3")).toBeInTheDocument();
  });

  it("shows the HTTP status and request id of a failed probe", async () => {
    stubFetchJson(
      { error: "Service Unavailable", requestId: "req-503" },
      {
        status: 503,
        headers: { [CorsExposedHeader.X_REQUEST_ID]: "req-503" },
      },
    );
    renderStackCheck();

    expect(await screen.findByText("req-503")).toBeInTheDocument();
    expect(screen.getByText("503")).toBeInTheDocument();
    expect(screen.getByText("Unhealthy")).toBeInTheDocument();
  });

  it("shows the request id of a reachable gateway that returns an unexpected body", async () => {
    stubFetchJson(
      { status: "ok" },
      { headers: { [CorsExposedHeader.X_REQUEST_ID]: "req-drift" } },
    );
    renderStackCheck();

    expect(await screen.findByText("req-drift")).toBeInTheDocument();
    expect(screen.getByText("invalid body")).toBeInTheDocument();
    expect(screen.queryByText(/Unreachable/)).not.toBeInTheDocument();
  });

  it("keeps the last probe visible and the button enabled while Run again is pending", async () => {
    const fetchMock = stubFetchJson(
      { status: "ok", version: "1.2.3" },
      { headers: { [CorsExposedHeader.X_REQUEST_ID]: "req-first" } },
    );
    renderStackCheck();
    expect(await screen.findByText("req-first")).toBeInTheDocument();

    const pending: { resolve?: (response: Response) => void } = {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          pending.resolve = resolve;
        }),
    );
    const runAgain = screen.getByRole("button", { name: "Run again" });
    await userEvent.click(runAgain);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("req-first")).toBeInTheDocument();
    expect(runAgain).toBeEnabled();

    pending.resolve?.(healthResponse("req-second"));

    expect(await screen.findByText("req-second")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "false");
  });
});
