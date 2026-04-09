// src/utils/apiHealthDot.ts

import { ApiHealthStatus } from "@enums/api-health-status";

export function getApiHealthDotClassName(
  apiHealthStatus: ApiHealthStatus,
): string {
  const base =
    "inline-block size-2.5 rounded-full ring-4 transition-colors motion-reduce:transition-none motion-reduce:animate-none";

  if (apiHealthStatus === ApiHealthStatus.CHECKING) {
    return `${base} bg-slate-400/80 ring-slate-400/20 animate-pulse`;
  }

  if (apiHealthStatus === ApiHealthStatus.HEALTHY) {
    return `${base} bg-emerald-500/90 ring-emerald-500/25 animate-health-glow`;
  }

  if (apiHealthStatus === ApiHealthStatus.UNHEALTHY) {
    return `${base} bg-red-500/90 ring-red-500/25 animate-health-shake`;
  }

  return `${base} bg-slate-400/80 ring-slate-400/20`;
}
