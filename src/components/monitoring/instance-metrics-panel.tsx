"use client";

import { useDashboard } from "@/components/layout/dashboard-context";
import { Card } from "@/components/ui/card";
import { RefreshControl } from "@/components/ui/refresh-control";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useApi } from "@/lib/hooks/use-api";
import { getTimeRange, type TimeRangeKey } from "@/lib/time-ranges";
import { sourceSlug, type DataSource, type InstanceMetrics } from "@/lib/types";
import { MetricChartCard } from "./metric-chart";
import { TimeRangeSelect } from "./time-range-select";

/** All CloudWatch metrics for one instance, with a period selector. */
export function InstanceMetricsPanel({
  source,
  instanceId,
  range,
  onRangeChange,
}: {
  source: DataSource;
  instanceId: string;
  range: TimeRangeKey;
  onRangeChange: (range: TimeRangeKey) => void;
}) {
  const { refreshIntervalSec } = useDashboard();
  const { data, error, isLoading, isRefreshing, lastUpdated, refetch } = useApi<InstanceMetrics>(
    `/api/instances/${sourceSlug(source)}/${instanceId}/metrics?range=${range}`,
    { refreshIntervalSec },
  );
  const rangeInfo = getTimeRange(range);
  // AWS instances with basic monitoring use at least 5-minute periods, so prefer what the server used.
  const periodSec = data?.range === range ? data.periodSec : rangeInfo.periodSec;
  const periodLabel = periodSec >= 60 ? `${periodSec / 60}-minute` : `${periodSec}-second`;

  return (
    <section aria-label="CloudWatch metrics">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-navy-900 dark:text-navy-100">
            CloudWatch metrics
            {source === "MOCK" ? <span className="ml-2 text-xs font-normal text-violet-700 dark:text-violet-300">(generated demo values)</span> : null}
          </h2>
          <p className="text-xs text-navy-500 dark:text-navy-400">
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
