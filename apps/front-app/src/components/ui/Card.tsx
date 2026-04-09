// src/components/ui/Card.tsx

import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "subtle";
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({ className, variant = "default", ...props }: CardProps) {
  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    default: "bg-white/5 ring-1 ring-white/10",
    subtle: "bg-transparent ring-1 ring-white/10",
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
