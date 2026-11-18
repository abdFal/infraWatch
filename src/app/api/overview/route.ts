import { NextResponse } from "next/server";
import { listActivity } from "@/lib/activity-queries";
import { withApi } from "@/lib/api/route-helpers";
import { getSummary } from "@/lib/monitoring-service";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const [summary, activity] = await Promise.all([
    getSummary(),
    listActivity({ page: 1, pageSize: 8 }),
  ]);
  return NextResponse.json({ data: { summary, recentActivity: activity.items } });
});
