import { ApiHealthStatus } from "#/enums/api-health-status";
import { cx } from "#/utils/cx";

const DOT_BASE =
  "inline-block size-2 rounded-full ring-3 transition-colors forced-color-adjust-none";

const PRESENTATION: Record<
  ApiHealthStatus,
  { label: string; dotClassName: string; loopClassName?: string }
> = {
  [ApiHealthStatus.IDLE]: {
    label: "Offline",
    dotClassName: "bg-muted-foreground ring-muted-foreground/20",
  },
  [ApiHealthStatus.CHECKING]: {
    label: "Checking…",
    dotClassName: "bg-muted-foreground ring-muted-foreground/20",
    loopClassName: "motion-safe:animate-health-pulse",
  },
  [ApiHealthStatus.HEALTHY]: {
    label: "Healthy",
    dotClassName:
      "relative bg-success ring-success/25 after:absolute after:inset-0 after:rounded-full after:opacity-0 after:glow-health",
    loopClassName: "motion-safe:after:animate-health-glow",
  },
  [ApiHealthStatus.UNHEALTHY]: {
    label: "Unhealthy",
    dotClassName: "bg-danger ring-danger/25",
    loopClassName: "motion-safe:animate-health-shake",
  },
};

export type ApiHealthIndicatorProps = Readonly<{
  status: ApiHealthStatus;
}>;

export function ApiHealthIndicator({ status }: ApiHealthIndicatorProps) {
  const { label, dotClassName, loopClassName } = PRESENTATION[status];

  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cx(DOT_BASE, dotClassName, loopClassName)}
        aria-hidden="true"
      />
      <span
        className="reserve-label"
        data-label={PRESENTATION[ApiHealthStatus.UNHEALTHY].label}
      >
        <span>{label}</span>
      </span>
    </span>
  );
}
