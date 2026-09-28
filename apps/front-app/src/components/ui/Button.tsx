import type { ButtonHTMLAttributes } from "react";
import { cx } from "#/utils/cx";

const BASE =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 active:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-60";

export function Button({
  className,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type ?? "button"}
      className={cx(BASE, className)}
      {...props}
    />
  );
}
