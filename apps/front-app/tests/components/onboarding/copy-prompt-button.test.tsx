// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyPromptButton } from "#/components/onboarding/CopyPromptButton";

function setup(writeText: (text: string) => Promise<void>) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeText);
  render(<CopyPromptButton />);
  return user;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("CopyPromptButton", () => {
  it("announces the copy, then clears the announcement after 2 s", async () => {
    const user = setup(() => Promise.resolve());

    await user.click(screen.getByRole("button", { name: "Copy prompt" }));

    expect(screen.getByRole("status")).toHaveTextContent("Copied!");
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("announces a failure when the clipboard rejects the write", async () => {
    const user = setup(() => Promise.reject(new Error("denied")));

    await user.click(screen.getByRole("button", { name: "Copy prompt" }));

    expect(screen.getByRole("status")).toHaveTextContent("Copy failed");
  });
});
