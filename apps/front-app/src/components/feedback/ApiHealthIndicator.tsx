import { ApiHealthStatus } from "#/enums/api-health-status";

const DOT_BASE =
  "inline-block size-2.5 rounded-full ring-4 transition-colors motion-reduce:transition-none motion-reduce:animate-none";

const PRESENTATION: Record<
  ApiHealthStatus,
  { label: string; dotClassName: string }
> = {
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

export type ApiHealthIndicatorProps = Readonly<{
  status: ApiHealthStatus;
}>;

export function ApiHealthIndicator({ status }: ApiHealthIndicatorProps) {
  const { label, dotClassName } = PRESENTATION[status];

  return (
    <div
      className="inline-flex items-center gap-2.5 opacity-95 transition-opacity motion-reduce:transition-none"
      aria-live="polite"
    >
      <span className={dotClassName} aria-hidden="true" />
      <span className="text-[0.95rem] text-muted-foreground">{label}</span>
    </div>
  );
}
