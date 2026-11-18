import "server-only";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { timeRangeFromDb, type TimeRangeKey } from "@/lib/time-ranges";

export interface AppSettingsView {
  awsRegion: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PreferencesView {
  refreshIntervalSec: number;
  defaultTimeRange: TimeRangeKey;
}

/** Application-wide settings. Creates the singleton row on first use. */
export async function getAppSettings(): Promise<AppSettingsView> {
  const row = await db.appSettings.findUnique({
    where: { id: 1 },
    include: { updatedBy: { select: { name: true } } },
  });
  if (row) {
    return {
      awsRegion: row.awsRegion,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy?.name ?? null,
    };
  }
  const created = await db.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, awsRegion: getEnv().AWS_REGION },
  });
  return { awsRegion: created.awsRegion, updatedAt: created.updatedAt.toISOString(), updatedBy: null };
}

export async function getActiveRegion() {
  return (await getAppSettings()).awsRegion;
}

/** Per-user monitoring preferences, with defaults when none are saved yet. */
export async function getPreferences(userId: string): Promise<PreferencesView> {
  const pref = await db.monitoringPreference.findUnique({ where: { userId } });
  return {
    refreshIntervalSec: pref?.refreshIntervalSec ?? 60,
    defaultTimeRange: pref ? timeRangeFromDb(pref.defaultTimeRange) : "3h",
  };
}
