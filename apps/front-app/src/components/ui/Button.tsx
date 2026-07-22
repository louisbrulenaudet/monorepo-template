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
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60";

  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base",
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
    ghost:
      "bg-transparent text-foreground hover:bg-foreground/10 active:bg-foreground/15",
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
