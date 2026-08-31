import type { HTMLAttributes } from "react";
import { cx } from "#/utils/cx";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "subtle";
};

const VARIANTS: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "bg-card ring-1 ring-border",
  subtle: "bg-transparent ring-1 ring-border",
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-xl p-6 text-left shadow-sm",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
