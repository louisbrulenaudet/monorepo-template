import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "#/utils/copy-text";

describe("copyText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes to the async clipboard and returns true", async () => {
    const writeText = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(copyText("prompt")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("prompt");
  });

  it("returns false when the clipboard write rejects", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi
          .fn<() => Promise<void>>()
          .mockRejectedValue(new Error("denied")),
      },
    });

    await expect(copyText("prompt")).resolves.toBe(false);
  });

  it("returns false when no clipboard is available", async () => {
    vi.stubGlobal("navigator", {});

    await expect(copyText("prompt")).resolves.toBe(false);
  });
});
