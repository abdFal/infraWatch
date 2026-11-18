import { NextResponse } from "next/server";
import { ApiError, withApi } from "@/lib/api/route-helpers";
import { getInstanceDetail } from "@/lib/monitoring-service";
import { instanceIdSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = withApi<{ params: Promise<{ instanceId: string }> }>(async (_request, { params }) => {
  const instanceId = instanceIdSchema.parse((await params).instanceId);
  const instance = await getInstanceDetail(instanceId);
  if (!instance) throw new ApiError(404, "NOT_FOUND", "Instance not found in the selected region.");
  return NextResponse.json({ data: instance });
});
