import { NextResponse } from "next/server";
import { clientIpFrom, logActivity } from "@/lib/activity";
import { ApiError, withApi } from "@/lib/api/route-helpers";
import { db } from "@/lib/db";
import { getPreferences } from "@/lib/settings";
import { timeRangeToDb } from "@/lib/time-ranges";
import { preferencesSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const PUT = withApi(async (request, { user }) => {
  const body = await request.json().catch(() => {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  });
  const input = preferencesSchema.parse(body);

  await db.monitoringPreference.upsert({
    where: { userId: user.id },
    update: {
      refreshIntervalSec: input.refreshIntervalSec,
      defaultTimeRange: timeRangeToDb(input.defaultTimeRange),
    },
    create: {
      userId: user.id,
      refreshIntervalSec: input.refreshIntervalSec,
      defaultTimeRange: timeRangeToDb(input.defaultTimeRange),
    },
  });

  await logActivity({
    action: "PREFERENCES_UPDATED",
    description: `${user.name} set refresh interval to ${input.refreshIntervalSec}s and default range to ${input.defaultTimeRange}`,
    userId: user.id,
    ipAddress: clientIpFrom(request.headers),
    metadata: input,
  });

  return NextResponse.json({ data: await getPreferences(user.id) });
});
