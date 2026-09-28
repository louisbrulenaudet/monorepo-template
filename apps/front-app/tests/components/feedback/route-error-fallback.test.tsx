// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "#/components/feedback/ErrorBoundary";
import { rememberSentryEventId } from "#/config/sentry";

function reportToSentry(error: unknown, eventId: string): void {
  rememberSentryEventId(
    { type: undefined, event_id: eventId },
    { originalException: error },
  );
}

function Crash({ error }: Readonly<{ error: Error }>): never {
  throw error;
}

describe("RouteErrorFallback", () => {
  it("shows the Sentry event id reported for its error after it renders, not a later one", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Crash error={new Error("boom")} />
      </ErrorBoundary>,
      {
        onCaughtError: (error) => {
          reportToSentry(error, "evt-1");
        },
      },
    );

    expect(await screen.findByText("Error id: evt-1")).toBeInTheDocument();

    act(() => {
      reportToSentry(new Error("later"), "evt-2");
    });

    expect(screen.getByText("Error id: evt-1")).toBeInTheDocument();
  });
});
