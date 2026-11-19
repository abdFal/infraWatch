"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";
import { useDashboard } from "@/components/layout/dashboard-context";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { RefreshControl } from "@/components/ui/refresh-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useApi } from "@/lib/hooks/use-api";
import type { ActivityLogEntry, Paginated } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { ACTIVITY_META, ActivityIcon } from "./activity-list";

const PAGE_SIZE = 20;

export function ActivityView() {
  const { refreshIntervalSec } = useDashboard();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (action) params.set("action", action);
  const { data, error, isLoading, isRefreshing, lastUpdated, refetch } = useApi<Paginated<ActivityLogEntry>>(
    `/api/activity?${params.toString()}`,
    { refreshIntervalSec },
  );

  return (
    <>
      <PageHeader
        title="Activity Logs"
        description="Audit trail of sign-ins, configuration changes and monitoring provider errors."
        actions={<RefreshControl lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refetch} refreshIntervalSec={refreshIntervalSec} />}
      />
      <Card>
        <div className="flex items-center gap-3 border-b border-navy-100 dark:border-navy-800 p-4">
          <Select
            className="w-full sm:w-64"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by activity type"
          >
            <option value="">All activity types</option>
            {Object.entries(ACTIVITY_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {error ? <ErrorState message={error.message} onRetry={refetch} /> : null}
        {data && data.items.length === 0 ? (
          <EmptyState icon={ScrollText} title="No activity found" description={action ? "No entries of this type yet." : undefined} />
        ) : null}
        {data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-navy-50 dark:bg-navy-800/50 text-xs font-medium uppercase tracking-wide text-navy-500 dark:text-navy-400">
                  <tr>
                    <th scope="col" className="px-5 py-3">Event</th>
                    <th scope="col" className="px-3 py-3">User</th>
                    <th scope="col" className="px-3 py-3">IP address</th>
                    <th scope="col" className="px-5 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <ActivityIcon action={item.action} />
                          <div className="min-w-0">
                            <p className="text-navy-800 dark:text-navy-200">{item.description}</p>
                            <p className="text-xs text-navy-500 dark:text-navy-400">{ACTIVITY_META[item.action]?.label ?? item.action}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-navy-700 dark:text-navy-300">{item.user ? item.user.email : <span className="text-navy-400 dark:text-navy-500">System</span>}</td>
                      <td className="px-3 py-3 font-mono text-xs text-navy-600 dark:text-navy-400">{item.ipAddress ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-navy-700 dark:text-navy-300">{formatDateTime(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} itemLabel="entries" />
          </>
        ) : null}
      </Card>
    </>
  );
}
