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
import { InstanceStateBadge } from "@/components/ui/status-badge";
import { useApi } from "@/lib/hooks/use-api";
import { TIME_RANGE_KEYS, type TimeRangeKey } from "@/lib/time-ranges";
import type { InstanceState } from "@/lib/types";
import { InstanceMetricsPanel } from "./instance-metrics-panel";

interface InstanceOption {
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
  const { data: options, error, isLoading, refetch } = useApi<InstanceOption[]>("/api/instances/options");

  const rangeParam = searchParams.get("range");
  const range: TimeRangeKey = TIME_RANGE_KEYS.includes(rangeParam as TimeRangeKey) ? (rangeParam as TimeRangeKey) : defaultTimeRange;
  const requested = searchParams.get("instance");
  const selected =
    options?.find((o) => o.instanceId === requested) ?? options?.find((o) => o.state === "running") ?? options?.[0];

  function update(next: { instance?: string; range?: TimeRangeKey }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.instance) params.set("instance", next.instance);
    if (next.range) params.set("range", next.range);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <>
      <PageHeader title="Monitoring" description="CloudWatch metrics for an individual EC2 instance." />

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
              value={selected.instanceId}
              onChange={(e) => update({ instance: e.target.value })}
            >
              {options.map((o) => (
                <option key={o.instanceId} value={o.instanceId}>
                  {o.name ?? "(no name)"} · {o.instanceId} · {o.instanceType} · {o.state}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-3">
              <InstanceStateBadge state={selected.state} />
              <Link href={`/instances/${selected.instanceId}`} className="text-sm font-medium text-sky-700 hover:underline">
                Details
              </Link>
            </div>
          </div>
        ) : null}
      </Card>

      {selected ? (
        <InstanceMetricsPanel key={selected.instanceId} instanceId={selected.instanceId} range={range} onRangeChange={(r) => update({ range: r })} />
      ) : null}
    </>
  );
}
