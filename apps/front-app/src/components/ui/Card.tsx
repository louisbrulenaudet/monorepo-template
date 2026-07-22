import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "subtle";
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

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
