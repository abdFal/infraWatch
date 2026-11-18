import { NextResponse } from "next/server";
import { listActivity } from "@/lib/activity-queries";
import { searchParamsObject, withApi } from "@/lib/api/route-helpers";
import { activityQuerySchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const query = activityQuerySchema.parse(searchParamsObject(request));
  return NextResponse.json({ data: await listActivity(query) });
});
