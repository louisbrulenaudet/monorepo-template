// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "#/components/ui/Button";

describe("Button", () => {
  it("renders a button element defaulting to type=button", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("fires onClick when clicked", async () => {
    const onClick = vi.fn<() => void>();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("blocks the handler and sets the attribute when disabled", async () => {
    const onClick = vi.fn<() => void>();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
