// src/components/feedback/StatusDot.tsx

export type StatusDotProps = {
  className: string;
  label: string;
};

export function StatusDot({ className, label }: StatusDotProps) {
  return <span className={className} role="img" aria-label={label} />;
}
