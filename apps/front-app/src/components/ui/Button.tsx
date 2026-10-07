import type { ComponentProps } from "react";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "#/components/ui/button-classes";
import { cx } from "#/utils/cx";

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  type,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cx(buttonClasses({ variant, size }), className)}
      {...props}
    />
  );
}
