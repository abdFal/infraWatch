"use client";

import { useDashboard } from "@/components/layout/dashboard-context";
import { Card } from "@/components/ui/card";
import { RefreshControl } from "@/components/ui/refresh-control";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useApi } from "@/lib/hooks/use-api";
import { getTimeRange, type TimeRangeKey } from "@/lib/time-ranges";
import type { InstanceMetrics } from "@/lib/types";
import { MetricChartCard } from "./metric-chart";
import { TimeRangeSelect } from "./time-range-select";

/** All CloudWatch metrics for one instance, with a period selector. */
export function InstanceMetricsPanel({
  instanceId,
  range,
  onRangeChange,
}: {
  instanceId: string;
  range: TimeRangeKey;
  onRangeChange: (range: TimeRangeKey) => void;
}) {
  const { refreshIntervalSec } = useDashboard();
  const { data, error, isLoading, isRefreshing, lastUpdated, refetch } = useApi<InstanceMetrics>(
    `/api/instances/${instanceId}/metrics?range=${range}`,
    { refreshIntervalSec },
  );
  const rangeInfo = getTimeRange(range);
  const periodLabel = rangeInfo.periodSec >= 60 ? `${rangeInfo.periodSec / 60}-minute` : `${rangeInfo.periodSec}-second`;

  return (
    <section aria-label="CloudWatch metrics">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">CloudWatch metrics</h2>
          <p className="text-xs text-slate-500">
            {rangeInfo.label} · {periodLabel} period · rates are per second
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeSelect value={range} onChange={onRangeChange} />
          <RefreshControl lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refetch} refreshIntervalSec={refreshIntervalSec} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : null}
      {error ? (
        <Card>
          <ErrorState message={error.message} onRetry={refetch} />
        </Card>
      ) : null}
      {data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.series.map((series) => (
            <MetricChartCard key={series.key} series={series} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
