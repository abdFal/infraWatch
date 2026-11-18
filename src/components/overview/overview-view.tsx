"use client";

import Link from "next/link";
import { ArrowRight, CircleStop, Loader2, PlayCircle, Server, ScrollText } from "lucide-react";
import { ActivityList } from "@/components/activity/activity-list";
import { useDashboard } from "@/components/layout/dashboard-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RefreshControl } from "@/components/ui/refresh-control";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { InstanceStateBadge, overallStatusStyles, StatusCheckBadge } from "@/components/ui/status-badge";
import { useApi } from "@/lib/hooks/use-api";
import type { ActivityLogEntry, InfrastructureSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface OverviewData {
  summary: InfrastructureSummary;
  recentActivity: ActivityLogEntry[];
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ElementType;
  accent: string;
  href: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full p-4 transition-shadow group-hover:shadow-md sm:p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <span className={cn("hidden rounded-lg p-2 sm:block", accent)}>
            <Icon className="size-4" aria-hidden />
          </span>
        </div>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </Card>
    </Link>
  );
}

function StateDistribution({ summary }: { summary: InfrastructureSummary }) {
  const segments = [
    { label: "Running", value: summary.running, className: "bg-emerald-500" },
    { label: "Transitional", value: summary.transitional, className: "bg-amber-400" },
    { label: "Stopped", value: summary.stopped, className: "bg-slate-400" },
  ].filter((s) => s.value > 0);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  return (
    <div>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Instance state distribution">
        {segments.map((s) => (
          <div key={s.label} className={cn("h-full first:rounded-l-full last:rounded-r-full", s.className)} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", s.className)} aria-hidden />
            {s.label}
            <span className="font-medium tabular-nums text-slate-900">{s.value}</span>
            <span className="text-slate-400">({Math.round((s.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export function OverviewView() {
  const { refreshIntervalSec } = useDashboard();
  const { data, error, isLoading, isRefreshing, lastUpdated, refetch } = useApi<OverviewData>("/api/overview", {
    refreshIntervalSec,
  });

  return (
    <>
      <PageHeader
        title="Overview"
        description="Health of the EC2 fleet in the selected region."
        actions={
          <RefreshControl lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refetch} refreshIntervalSec={refreshIntervalSec} />
        }
      />

      {isLoading ? <OverviewSkeleton /> : null}
      {error ? (
        <Card>
          <ErrorState message={error.message} onRetry={refetch} />
        </Card>
      ) : null}

      {data ? <OverviewContent data={data} /> : null}
    </>
  );
}

function OverviewContent({ data }: { data: OverviewData }) {
  const { summary, recentActivity } = data;
  const status = overallStatusStyles[summary.overallStatus];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className={cn("flex items-start gap-3 rounded-xl border px-5 py-4", status.className)}>
        <StatusIcon className={cn("mt-0.5 size-5 shrink-0", summary.overallStatus === "transitioning" && "animate-spin [animation-duration:3s]")} aria-hidden />
        <div>
          <p className="font-semibold">{status.label}</p>
          <p className="text-sm opacity-90">
            {status.description}
            {summary.impaired > 0 ? ` ${summary.impaired} instance${summary.impaired > 1 ? "s" : ""} impaired.` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total instances" value={summary.total} hint={`Excludes ${summary.terminated} terminated`} icon={Server} accent="bg-slate-100 text-slate-600" href="/instances" />
        <StatCard label="Running" value={summary.running} hint="Serving workloads" icon={PlayCircle} accent="bg-emerald-50 text-emerald-600" href="/instances?state=running" />
        <StatCard label="Stopped" value={summary.stopped} hint="Not billed for compute" icon={CircleStop} accent="bg-slate-100 text-slate-600" href="/instances?state=stopped" />
        <StatCard label="Pending / transitional" value={summary.transitional} hint="Pending, stopping or shutting down" icon={Loader2} accent="bg-amber-50 text-amber-700" href="/instances?state=transitional" />
      </div>

      <Card>
        <CardHeader title="Instance states" description="Share of non-terminated instances by state" />
        <CardBody>
          {summary.total > 0 ? <StateDistribution summary={summary} /> : <p className="text-sm text-slate-500">No instances in this region.</p>}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Needs attention" description="Impaired status checks or state changes in progress" />
          {summary.attention.length === 0 ? (
            <EmptyState title="Nothing needs attention" description="All instances are in a steady state and passing status checks." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.attention.map((item) => (
                <li key={item.instanceId}>
                  <Link href={`/instances/${item.instanceId}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.name ?? "(no name)"}</p>
                      <p className="font-mono text-xs text-slate-500">{item.instanceId}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <InstanceStateBadge state={item.state} />
                      {item.instanceStatus === "impaired" || item.systemStatus === "impaired" ? <StatusCheckBadge status="impaired" /> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent activity"
            description="Sign-ins, configuration changes and provider errors"
            actions={
              <Link href="/activity" className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900">
                View all <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {recentActivity.length === 0 ? (
            <EmptyState icon={ScrollText} title="No activity yet" />
          ) : (
            <ActivityList items={recentActivity} />
          )}
        </Card>
      </div>
    </div>
  );
}
