"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, LineChart, ServerOff } from "lucide-react";
import { useDashboard } from "@/components/layout/dashboard-context";
import { InstanceMetricsPanel } from "@/components/monitoring/instance-metrics-panel";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SourceBadge } from "@/components/ui/source-badge";
import { InstanceStateBadge, StatusCheckBadge } from "@/components/ui/status-badge";
import { useApi } from "@/lib/hooks/use-api";
import type { TimeRangeKey } from "@/lib/time-ranges";
import { sourceSlug, type DataSource, type Ec2Instance } from "@/lib/types";
import { formatDateTime, formatUptime } from "@/lib/utils";

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className={`mt-0.5 truncate text-sm text-slate-900 ${mono ? "font-mono text-[13px]" : ""}`}>{value ?? "—"}</dd>
    </div>
  );
}

export function InstanceDetailView({ source, instanceId }: { source: DataSource; instanceId: string }) {
  const { defaultTimeRange } = useDashboard();
  const [range, setRange] = useState<TimeRangeKey>(defaultTimeRange);
  const { data: instance, error, isLoading, refetch } = useApi<Ec2Instance>(`/api/instances/${sourceSlug(source)}/${instanceId}`);

  const back = (
    <Link href="/instances" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
      <ArrowLeft className="size-4" /> All instances
    </Link>
  );

  if (isLoading) {
    return (
      <>
        {back}
        <Skeleton className="mb-6 h-10 w-80" />
        <Skeleton className="h-64 rounded-xl" />
      </>
    );
  }

  if (error) {
    return (
      <>
        {back}
        <Card>
          {error.status === 404 ? (
            <EmptyState
              icon={ServerOff}
              title="Instance not found"
              description="This instance doesn't exist in the currently selected region, or it was terminated and removed."
            />
          ) : (
            <ErrorState message={error.message} onRetry={refetch} />
          )}
        </Card>
      </>
    );
  }

  if (!instance) return null;

  const customTags = Object.entries(instance.tags).filter(([key]) => key !== "Name");

  return (
    <>
      {back}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900">{instance.name ?? "(no name)"}</h1>
            <SourceBadge source={instance.source} />
            <InstanceStateBadge state={instance.state} />
          </div>
          <p className="mt-1 font-mono text-sm text-slate-500">{instance.instanceId}</p>
        </div>
        <Link href={`/monitoring?source=${sourceSlug(instance.source)}&instance=${instance.instanceId}&range=${range}`} className={buttonClasses({ size: "sm" })}>
          <LineChart className="size-4" /> Open in Monitoring
        </Link>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Instance details" />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Data source" value={instance.source === "AWS" ? "AWS (your account)" : "Mock (generated demo data)"} />
            <Field label="Instance ID" value={instance.instanceId} mono />
            <Field label="Instance type" value={instance.instanceType} mono />
            <Field label="State" value={<InstanceStateBadge state={instance.state} />} />
            <Field label="AWS Region" value={instance.region} />
            <Field label="Availability Zone" value={instance.availabilityZone} />
            <Field label="Launch time" value={formatDateTime(instance.launchTime)} />
            <Field label="Uptime" value={instance.state === "running" ? formatUptime(instance.launchTime) : "—"} />
            <Field label="Public IP" value={instance.publicIp} mono />
            <Field label="Private IP" value={instance.privateIp} mono />
            <Field label="Platform" value={instance.platform} />
            <Field label="Architecture" value={instance.architecture} />
            <Field label="Monitoring" value={instance.monitoring === "detailed" ? "Detailed (1-minute)" : "Basic (5-minute)"} />
            <Field label="VPC" value={instance.vpcId} mono />
            <Field label="Subnet" value={instance.subnetId} mono />
            <Field label="AMI" value={instance.imageId} mono />
          </dl>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Status checks" description={instance.source === "AWS" ? "Reported by EC2" : "Generated demo values"} />
            <dl className="space-y-3 px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sm text-slate-600">System reachability</dt>
                <dd><StatusCheckBadge status={instance.systemStatus} /></dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sm text-slate-600">Instance reachability</dt>
                <dd><StatusCheckBadge status={instance.instanceStatus} /></dd>
              </div>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Tags" />
            {customTags.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">No tags other than Name.</p>
            ) : (
              <dl className="divide-y divide-slate-100">
                {customTags.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3 px-5 py-2 text-sm">
                    <dt className="truncate text-slate-500">{key}</dt>
                    <dd className="truncate font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        </div>
      </div>

      <InstanceMetricsPanel source={instance.source} instanceId={instance.instanceId} range={range} onRangeChange={setRange} />
    </>
  );
}
