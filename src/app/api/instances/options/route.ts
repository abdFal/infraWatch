import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/route-helpers";
import { listInstanceOptions } from "@/lib/monitoring-service";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  return NextResponse.json({ data: await listInstanceOptions() });
});
