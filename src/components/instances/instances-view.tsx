"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Server, X } from "lucide-react";
import { useDashboard } from "@/components/layout/dashboard-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { RefreshControl } from "@/components/ui/refresh-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SourceBadge, SourceStatusNotice } from "@/components/ui/source-badge";
import { InstanceStateBadge } from "@/components/ui/status-badge";
import { useApi } from "@/lib/hooks/use-api";
import { sourceSlug, type Ec2Instance, type MonitoringMode, type Paginated, type SourceStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const STATE_OPTIONS = [
  { value: "", label: "All states" },
  { value: "running", label: "Running" },
  { value: "stopped", label: "Stopped" },
  { value: "transitional", label: "Pending / transitional" },
  { value: "pending", label: "Pending" },
  { value: "stopping", label: "Stopping" },
  { value: "shutting-down", label: "Shutting down" },
  { value: "terminated", label: "Terminated" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "aws", label: "AWS (real)" },
  { value: "mock", label: "Mock (demo)" },
];

const PAGE_SIZE = 10;

export function InstancesView() {
  const { refreshIntervalSec, providerMode } = useDashboard();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const state = searchParams.get("state") ?? "";
  const search = searchParams.get("search") ?? "";
  const source = searchParams.get("source") ?? "";
  const [searchInput, setSearchInput] = useState(search);

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || (key === "page" && value === 1)) params.delete(key);
      else params.set(key, String(value));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Debounce search input -> URL.
  useEffect(() => {
    if (searchInput === search) return;
    const id = setTimeout(() => updateParams({ search: searchInput.trim(), page: 1 }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const apiParams = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (state) apiParams.set("state", state);
  if (search) apiParams.set("search", search);
  if (source) apiParams.set("source", source);
  const { data, error, isLoading, isRefreshing, lastUpdated, refetch } = useApi<
    Paginated<Ec2Instance> & { region: string; sources: SourceStatus[] }
  >(
    `/api/instances?${apiParams.toString()}`,
    { refreshIntervalSec },
  );

  const hasFilters = Boolean(state || search || source);
  const showSourceFilter = (providerMode as MonitoringMode) === "HYBRID";

  return (
    <>
      <PageHeader
        title="EC2 Instances"
        description={data ? `${data.total} instance${data.total === 1 ? "" : "s"} in ${data.region}${hasFilters ? " matching filters" : ""}` : "Instances in the selected region"}
        actions={<RefreshControl lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refetch} refreshIntervalSec={refreshIntervalSec} />}
      />

      <SourceStatusNotice sources={data?.sources} className="mb-4" />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by instance ID or name"
              aria-label="Search instances by ID or name"
              maxLength={100}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-xs placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <Select
            className="sm:w-56"
            value={state}
            onChange={(e) => updateParams({ state: e.target.value, page: 1 })}
            aria-label="Filter by instance state"
          >
            {STATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {showSourceFilter ? (
            <Select
              className="sm:w-44"
              value={source}
              onChange={(e) => updateParams({ source: e.target.value, page: 1 })}
              aria-label="Filter by data source"
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ) : null}
          {hasFilters ? (
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setSearchInput("");
                updateParams({ search: undefined, state: undefined, source: undefined, page: 1 });
              }}
            >
              <X className="size-4" /> Clear
            </Button>
          ) : null}
        </div>

        {isLoading ? <TableSkeleton /> : null}
        {error ? <ErrorState message={error.message} onRetry={refetch} /> : null}
        {data && data.items.length === 0 ? (
          <EmptyState
            icon={Server}
            title={hasFilters ? "No instances match your filters" : "No instances in this region"}
            description={hasFilters ? "Try a different search term, state or source filter." : "Change the AWS region in Settings to see instances elsewhere."}
          />
        ) : null}
        {data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3">Instance</th>
                    <th scope="col" className="px-3 py-3">State</th>
                    <th scope="col" className="px-3 py-3">Type</th>
                    <th scope="col" className="px-3 py-3">Region / AZ</th>
                    <th scope="col" className="px-3 py-3">Public IP</th>
                    <th scope="col" className="px-3 py-3">Private IP</th>
                    <th scope="col" className="px-5 py-3">Launch time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((instance) => (
                    <tr key={`${instance.source}:${instance.instanceId}`} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link href={`/instances/${sourceSlug(instance.source)}/${instance.instanceId}`} className="group block">
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 group-hover:text-sky-700 group-hover:underline">
                              {instance.name ?? <span className="italic text-slate-500">(no name)</span>}
                            </span>
                            <SourceBadge source={instance.source} />
                          </span>
                          <span className="block font-mono text-xs text-slate-500">{instance.instanceId}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3"><InstanceStateBadge state={instance.state} /></td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">{instance.instanceType}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {instance.region}
                        <span className="block text-xs text-slate-500">{instance.availabilityZone ?? "—"}</span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">{instance.publicIp ?? "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">{instance.privateIp ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-700">{formatDateTime(instance.launchTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={(p) => updateParams({ page: p })}
              itemLabel="instances"
            />
          </>
        ) : null}
      </Card>
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
