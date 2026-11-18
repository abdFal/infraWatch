"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LineChart } from "lucide-react";
import { useDashboard } from "@/components/layout/dashboard-context";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SourceBadge, SourceStatusNotice } from "@/components/ui/source-badge";
import { InstanceStateBadge } from "@/components/ui/status-badge";
import { useApi } from "@/lib/hooks/use-api";
import { TIME_RANGE_KEYS, type TimeRangeKey } from "@/lib/time-ranges";
import { sourceSlug, type DataSource, type InstanceState, type SourceStatus } from "@/lib/types";
import { InstanceMetricsPanel } from "./instance-metrics-panel";

interface InstanceOption {
  source: DataSource;
  instanceId: string;
  name: string | null;
  state: InstanceState;
  instanceType: string;
}

export function MonitoringView() {
  const { defaultTimeRange } = useDashboard();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, error, isLoading, refetch } = useApi<{ items: InstanceOption[]; sources: SourceStatus[] }>("/api/instances/options");
  const options = data?.items;

  const rangeParam = searchParams.get("range");
  const range: TimeRangeKey = TIME_RANGE_KEYS.includes(rangeParam as TimeRangeKey) ? (rangeParam as TimeRangeKey) : defaultTimeRange;
  // An instance is identified by source + ID (?source=aws&instance=i-...).
  const requested = searchParams.get("instance");
  const requestedSource = searchParams.get("source");
  const optionKey = (o: InstanceOption) => `${sourceSlug(o.source)}:${o.instanceId}`;
  const selected =
    options?.find((o) => o.instanceId === requested && (!requestedSource || sourceSlug(o.source) === requestedSource)) ??
    options?.find((o) => o.state === "running") ??
    options?.[0];

  function update(next: { key?: string; range?: TimeRangeKey }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.key) {
      const [source, instance] = next.key.split(":");
      params.set("source", source);
      params.set("instance", instance);
    }
    if (next.range) params.set("range", next.range);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <>
      <PageHeader title="Monitoring" description="CloudWatch metrics for an individual EC2 instance." />

      <SourceStatusNotice sources={data?.sources} className="mb-4" />

      <Card className="mb-6 p-4">
        {isLoading ? <Skeleton className="h-9 w-full max-w-lg" /> : null}
        {error ? <ErrorState message={error.message} onRetry={refetch} className="py-6" /> : null}
        {options && options.length === 0 ? (
          <EmptyState icon={LineChart} title="No instances to monitor" description="There are no non-terminated instances in the selected region." className="py-6" />
        ) : null}
        {options && selected ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label htmlFor="instance-select" className="text-sm font-medium text-slate-700 sm:w-20">
              Instance
            </label>
            <Select
              id="instance-select"
              className="w-full sm:max-w-lg"
              value={optionKey(selected)}
              onChange={(e) => update({ key: e.target.value })}
            >
              {options.map((o) => (
                <option key={optionKey(o)} value={optionKey(o)}>
                  [{o.source}] {o.name ?? "(no name)"} · {o.instanceId} · {o.instanceType} · {o.state}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-3">
              <SourceBadge source={selected.source} />
              <InstanceStateBadge state={selected.state} />
              <Link href={`/instances/${sourceSlug(selected.source)}/${selected.instanceId}`} className="text-sm font-medium text-sky-700 hover:underline">
                Details
              </Link>
            </div>
          </div>
        ) : null}
      </Card>

      {selected ? (
        <InstanceMetricsPanel
          key={optionKey(selected)}
          source={selected.source}
          instanceId={selected.instanceId} range={range} onRangeChange={(r) => update({ range: r })} />
      ) : null}
    </>
  );
}
