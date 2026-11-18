import { NextResponse } from "next/server";
import { searchParamsObject, withApi } from "@/lib/api/route-helpers";
import { searchInstances } from "@/lib/monitoring-service";
import { instanceListQuerySchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const query = instanceListQuerySchema.parse(searchParamsObject(request));
  const result = await searchInstances(query);
  return NextResponse.json({ data: result });
});
