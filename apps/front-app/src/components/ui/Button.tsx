// src/components/ui/Button.tsx

import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 disabled:cursor-not-allowed disabled:opacity-55";

  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base",
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-indigo-500 text-white hover:bg-indigo-400 active:bg-indigo-500/90",
    secondary:
      "bg-slate-700/60 text-slate-100 hover:bg-slate-700 active:bg-slate-700/80",
    ghost: "bg-transparent text-slate-100 hover:bg-white/10 active:bg-white/15",
  };

  return (
    <button
      type={type ?? "button"}
      disabled={disabled}
      className={cx(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
}
