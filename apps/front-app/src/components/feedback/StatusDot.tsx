// src/components/feedback/StatusDot.tsx

export type StatusDotProps = Readonly<{
  className: string;
  label: string;
  ariaHidden?: boolean;
}>;

export function StatusDot({ className, label, ariaHidden }: StatusDotProps) {
  if (ariaHidden) {
    return <span className={className} aria-hidden="true" />;
  }
  return <span className={className} role="img" aria-label={label} />;
}
