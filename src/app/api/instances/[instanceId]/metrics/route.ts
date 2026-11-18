import { NextResponse } from "next/server";
import { ApiError, searchParamsObject, withApi } from "@/lib/api/route-helpers";
import { getInstanceMetrics } from "@/lib/monitoring-service";
import { instanceIdSchema, metricsQuerySchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = withApi<{ params: Promise<{ instanceId: string }> }>(async (request, { params }) => {
  const instanceId = instanceIdSchema.parse((await params).instanceId);
  const { range } = metricsQuerySchema.parse(searchParamsObject(request));
  const metrics = await getInstanceMetrics(instanceId, range);
  if (!metrics) throw new ApiError(404, "NOT_FOUND", "Instance not found in the selected region.");
  return NextResponse.json({ data: metrics });
});
