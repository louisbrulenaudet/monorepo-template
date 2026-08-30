import { ApiHealthStatus } from "#/enums/api-health-status";

const DOT_BASE =
  "inline-block size-2.5 rounded-full ring-4 transition-colors motion-reduce:transition-none motion-reduce:animate-none";

type ApiHealthPresentation = {
  label: string;
  dotClassName: string;
};

const API_HEALTH_PRESENTATION: Record<ApiHealthStatus, ApiHealthPresentation> =
  {
    [ApiHealthStatus.IDLE]: {
      label: "API status",
      dotClassName: `${DOT_BASE} bg-slate-400/80 ring-slate-400/20`,
    },
    [ApiHealthStatus.CHECKING]: {
      label: "Checking…",
      dotClassName: `${DOT_BASE} bg-slate-400/80 ring-slate-400/20 animate-pulse`,
    },
    [ApiHealthStatus.HEALTHY]: {
      label: "Healthy",
      dotClassName: `${DOT_BASE} bg-emerald-500/90 ring-emerald-500/25 animate-health-glow`,
    },
    [ApiHealthStatus.UNHEALTHY]: {
      label: "Unhealthy",
      dotClassName: `${DOT_BASE} bg-red-500/90 ring-red-500/25 animate-health-shake`,
    },
  };

export function getApiHealthPresentation(
  apiHealthStatus: ApiHealthStatus,
): ApiHealthPresentation {
  return API_HEALTH_PRESENTATION[apiHealthStatus];
}

/** @internal */
export function getApiHealthDotClassName(
  apiHealthStatus: ApiHealthStatus,
): string {
  return getApiHealthPresentation(apiHealthStatus).dotClassName;
}
