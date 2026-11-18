/** Monitoring time ranges. Shared by client and server code. */
export const TIME_RANGES = [
  { key: "1h", db: "H1", label: "Last 1 hour", hours: 1, periodSec: 60 },
  { key: "3h", db: "H3", label: "Last 3 hours", hours: 3, periodSec: 300 },
  { key: "6h", db: "H6", label: "Last 6 hours", hours: 6, periodSec: 300 },
  { key: "12h", db: "H12", label: "Last 12 hours", hours: 12, periodSec: 600 },
  { key: "24h", db: "H24", label: "Last 24 hours", hours: 24, periodSec: 900 },
] as const;

export type TimeRangeKey = (typeof TIME_RANGES)[number]["key"];
export type TimeRangeDb = (typeof TIME_RANGES)[number]["db"];

export const TIME_RANGE_KEYS = TIME_RANGES.map((r) => r.key) as [TimeRangeKey, ...TimeRangeKey[]];

export function getTimeRange(key: TimeRangeKey) {
  return TIME_RANGES.find((r) => r.key === key) ?? TIME_RANGES[1];
}

export function timeRangeFromDb(db: TimeRangeDb): TimeRangeKey {
  return TIME_RANGES.find((r) => r.db === db)?.key ?? "3h";
}

export function timeRangeToDb(key: TimeRangeKey): TimeRangeDb {
  return getTimeRange(key).db;
}

/** Allowed auto-refresh intervals in seconds (0 = off). */
export const REFRESH_INTERVALS = [
  { value: 0, label: "Off" },
  { value: 15, label: "15 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
] as const;

export const REFRESH_INTERVAL_VALUES = REFRESH_INTERVALS.map((r) => r.value) as number[];
