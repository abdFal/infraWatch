import { NextResponse } from "next/server";
import { ApiError, searchParamsObject, withApi } from "@/lib/api/route-helpers";
import { getInstanceMetrics } from "@/lib/monitoring-service";
import { instanceIdSchema, metricsQuerySchema, sourceSlugSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ source: string; instanceId: string }> };

/** GET /api/instances/aws/i-0abc.../metrics?range=3h */
export const GET = withApi<Params>(async (request, { params }) => {
  const raw = await params;
  const source = sourceSlugSchema.parse(raw.source);
  const instanceId = instanceIdSchema.parse(raw.instanceId);
  const { range } = metricsQuerySchema.parse(searchParamsObject(request));
  const metrics = await getInstanceMetrics(source, instanceId, range);
  if (!metrics) throw new ApiError(404, "NOT_FOUND", "Instance not found in the selected region.");
  return NextResponse.json({ data: metrics });
});
