import type { ReactNode } from "react";
import { ApiHealthIndicator } from "#/components/health/ApiHealthIndicator";
import { Button } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import { chipClasses } from "#/components/ui/chip-classes";
import { apiBaseUrl } from "#/config/env";
import { ApiHealthStatus } from "#/enums/api-health-status";
import { useApiHealth } from "#/hooks/use-api-health";
import { HEALTH_PATH, type HealthProbe } from "#/services/worker-api/health";
import { cx } from "#/utils/cx";
import { FetchApiError, ResponseSchemaError } from "#/utils/fetch-api";

type RowProps = Readonly<{
  name: string;
  target: ReactNode;
  status: ApiHealthStatus;
}>;

function Row({ name, target, status }: RowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="w-20 shrink-0 text-foreground">{name}</span>
      <span className="order-last basis-full wrap-anywhere sm:order-0 sm:min-w-0 sm:flex-1 sm:basis-auto">
        {target}
      </span>
      <ApiHealthIndicator status={status} />
    </div>
  );
}

function RequestId({ value }: Readonly<{ value: string | null }>) {
  return (
    <span className="min-w-0 truncate" title={value ?? undefined}>
      request id <span className="select-all">{value ?? "none"}</span>
    </span>
  );
}

type ProbeResultProps = Readonly<{
  probe: HealthProbe | undefined;
  error: Error | null;
  isFetching: boolean;
}>;

function ProbeResult({
  probe,
  error,
  isFetching,
}: ProbeResultProps): ReactNode {
  if (error instanceof FetchApiError) {
    return (
      <>
        <span className={cx(chipClasses({ tone: "danger" }), "shrink-0")}>
          {error.status}
        </span>
        <RequestId value={error.requestId} />
      </>
    );
  }

  if (error instanceof ResponseSchemaError) {
    return (
      <>
        <span
          className={cx(
            chipClasses({ tone: "danger" }),
            "shrink-0 whitespace-nowrap",
          )}
        >
          invalid body
        </span>
        <RequestId value={error.requestId} />
      </>
    );
  }

  if (error) {
    return (
      <span>
        Unreachable at {apiBaseUrl || "this origin"}. Run{" "}
        <code className="whitespace-nowrap">pnpm dev</code> from the repo root.
      </span>
    );
  }

  if (!probe) {
    return isFetching ? "Probing…" : null;
  }

  return (
    <>
      <span
        className={cx(
          chipClasses({ tone: "success" }),
          "shrink-0 whitespace-nowrap",
        )}
      >
        200 {probe.status}
      </span>
      <span className="shrink-0">v{probe.version}</span>
      <span className="shrink-0 whitespace-nowrap">{probe.latencyMs} ms</span>
      <RequestId value={probe.requestId} />
    </>
  );
}

export function StackCheck() {
  const { status, probe, error, isFetching, updatedAt, refetch } =
    useApiHealth();
  const hasResult = probe !== undefined || error !== null;

  return (
    <Card className="w-full max-w-xl text-left font-mono text-xs text-muted-foreground">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-caption font-medium text-foreground">
          Stack check
        </h2>
        <Button variant="secondary" size="sm" onClick={refetch}>
          Run again
        </Button>
      </div>
      <div className="flex flex-col gap-3 px-5 py-4">
        <Row
          name="front-app"
          target={window.location.host}
          status={ApiHealthStatus.HEALTHY}
        />
        <Row name="worker-api" target={`GET ${HEALTH_PATH}`} status={status} />
        <p
          role="status"
          aria-busy={isFetching}
          className={cx(
            "min-h-15 rule-dashed pt-3 md:min-h-8",
            hasResult &&
              "transition-opacity aria-busy:opacity-60 aria-busy:delay-150",
          )}
        >
          <span
            key={updatedAt}
            className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 transition-opacity duration-150 md:flex-nowrap starting:opacity-0"
          >
            <ProbeResult probe={probe} error={error} isFetching={isFetching} />
          </span>
        </p>
      </div>
    </Card>
  );
}
