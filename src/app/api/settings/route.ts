import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/route-helpers";
import { getEnvironmentInfo } from "@/lib/environment-info";
import { getAppSettings, getPreferences } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const GET = withApi(async (_request, { user }) => {
  const [app, preferences] = await Promise.all([getAppSettings(), getPreferences(user.id)]);
  return NextResponse.json({
    data: {
      app,
      preferences,
      environment: getEnvironmentInfo(),
      canEditAppSettings: user.role === "ADMIN",
    },
  });
});
