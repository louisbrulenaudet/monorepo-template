import type { ApiHealthStatus } from "#/enums/api-health-status";
import { StatusDot } from "#/components/feedback/StatusDot";
import { getApiHealthPresentation } from "#/utils/api-health-dot";

export type ApiHealthIndicatorProps = Readonly<{
  status: ApiHealthStatus;
}>;

export function ApiHealthIndicator({ status }: ApiHealthIndicatorProps) {
  const { label, dotClassName } = getApiHealthPresentation(status);

  return (
    <div
      className="inline-flex items-center gap-2.5 opacity-95 transition-opacity motion-reduce:transition-none"
      aria-live="polite"
    >
      <StatusDot ariaHidden className={dotClassName} label={label} />
      <span className="text-[0.95rem] text-muted-foreground">{label}</span>
    </div>
  );
}
