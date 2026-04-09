// src/components/feedback/ApiHealthIndicator.tsx

import { ApiHealthStatus } from "@enums/api-health-status";
import { getApiHealthDotClassName } from "@utils/api-health-dot";
import { StatusDot } from "@/components/feedback/StatusDot";

export type ApiHealthIndicatorProps = {
  status: ApiHealthStatus;
};

function getStatusLabel(status: ApiHealthStatus): string {
  if (status === ApiHealthStatus.CHECKING) {
    return "Checking…";
  }
  if (status === ApiHealthStatus.HEALTHY) {
    return "Healthy";
  }
  if (status === ApiHealthStatus.UNHEALTHY) {
    return "Unhealthy";
  }
  return "API status";
}

export function ApiHealthIndicator({ status }: ApiHealthIndicatorProps) {
  const label = getStatusLabel(status);

  return (
    <div
      className="inline-flex items-center gap-2.5 opacity-95 transition-opacity motion-reduce:transition-none"
      aria-live="polite"
    >
      <StatusDot className={getApiHealthDotClassName(status)} label={label} />
      <span className="text-[0.95rem] text-slate-200/90">{label}</span>
    </div>
  );
}
