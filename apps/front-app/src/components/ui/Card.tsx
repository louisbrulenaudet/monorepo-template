import type { ComponentProps } from "react";
import { cx } from "#/utils/cx";

const HANDLE_POSITIONS = [
  "top-0 left-0 -translate-1/2",
  "top-0 right-0 translate-x-1/2 -translate-y-1/2",
  "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
  "right-0 bottom-0 translate-1/2",
] as const;

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("relative border border-border bg-card", className)}
      {...props}
    >
      {children}
      {HANDLE_POSITIONS.map((position) => (
        <span
          key={position}
          className={cx(
            "absolute size-3.5 rounded-[3px] border border-inherit bg-card",
            position,
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
