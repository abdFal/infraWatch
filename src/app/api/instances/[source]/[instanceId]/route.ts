import { NextResponse } from "next/server";
import { ApiError, withApi } from "@/lib/api/route-helpers";
import { getInstanceDetail } from "@/lib/monitoring-service";
import { instanceIdSchema, sourceSlugSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ source: string; instanceId: string }> };

/** GET /api/instances/aws/i-0abc...  or  /api/instances/mock/i-0abc... */
export const GET = withApi<Params>(async (_request, { params }) => {
  const raw = await params;
  const source = sourceSlugSchema.parse(raw.source);
  const instanceId = instanceIdSchema.parse(raw.instanceId);
  const instance = await getInstanceDetail(source, instanceId);
  if (!instance) throw new ApiError(404, "NOT_FOUND", "Instance not found in the selected region.");
  return NextResponse.json({ data: instance });
});
