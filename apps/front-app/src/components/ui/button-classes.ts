import { cx } from "#/utils/cx";

export type ButtonVariant = "primary" | "secondary";

export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full border font-medium whitespace-nowrap no-underline transition-[translate,scale,background-color,border-color,color] select-none active:translate-y-px active:scale-98 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-colors";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-primary-solid bg-primary-solid text-primary-foreground hover:border-primary-solid-hover hover:bg-primary-solid-hover",
  secondary:
    "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-10 gap-2 px-5 text-ui",
  sm: "h-7 gap-1.5 px-2.5 text-xs",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
} = {}): string {
  return cx(BASE, VARIANTS[variant], SIZES[size]);
}
