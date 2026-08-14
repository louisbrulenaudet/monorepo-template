import type { HTMLAttributes } from "react";
import { cx } from "#/utils/cx";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "subtle";
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    default: "bg-card ring-1 ring-border",
    subtle: "bg-transparent ring-1 ring-border",
  };

  return (
    <div
      className={cx(
        "rounded-xl p-6 text-left shadow-sm",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
