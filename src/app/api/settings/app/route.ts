import { NextResponse } from "next/server";
import { clientIpFrom, logActivity } from "@/lib/activity";
import { ApiError, withApi } from "@/lib/api/route-helpers";
import { db } from "@/lib/db";
import { clearInstanceCache } from "@/lib/monitoring-service";
import { getAppSettings } from "@/lib/settings";
import { appSettingsSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const PUT = withApi(async (request, { user }) => {
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Only administrators can change application settings.");
  }
  const body = await request.json().catch(() => {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  });
  const input = appSettingsSchema.parse(body);
  const previous = await getAppSettings();

  await db.appSettings.upsert({
    where: { id: 1 },
    update: { awsRegion: input.awsRegion, updatedById: user.id },
    create: { id: 1, awsRegion: input.awsRegion, updatedById: user.id },
  });
  clearInstanceCache();

  if (previous.awsRegion !== input.awsRegion) {
    await logActivity({
      action: "SETTINGS_UPDATED",
      description: `${user.name} changed AWS region from ${previous.awsRegion} to ${input.awsRegion}`,
      userId: user.id,
      ipAddress: clientIpFrom(request.headers),
      metadata: { from: previous.awsRegion, to: input.awsRegion },
    });
  }

  return NextResponse.json({ data: await getAppSettings() });
});
