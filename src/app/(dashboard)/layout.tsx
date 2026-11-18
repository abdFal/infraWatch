import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { db } from "@/lib/db";
import { getProviderMode } from "@/lib/providers";
import { getAppSettings, getPreferences } from "@/lib/settings";

/**
 * Layout for every signed-in page. Verifies the session on the server (the
 * proxy check alone is not trusted) and loads settings the UI needs.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) redirect("/login");

  const [app, preferences] = await Promise.all([getAppSettings(), getPreferences(user.id)]);

  return (
    <DashboardShell
      value={{
        user: { name: user.name, email: user.email, role: user.role },
        region: app.awsRegion,
        providerMode: getProviderMode(),
        refreshIntervalSec: preferences.refreshIntervalSec,
        defaultTimeRange: preferences.defaultTimeRange,
      }}
    >
      {children}
    </DashboardShell>
  );
}
