"use client";

import { createContext, use } from "react";
import type { TimeRangeKey } from "@/lib/time-ranges";
import type { MonitoringMode } from "@/lib/types";

export interface DashboardContextValue {
  user: { name: string; email: string; role: "ADMIN" | "VIEWER" };
  region: string;
  providerMode: MonitoringMode;
  refreshIntervalSec: number;
  defaultTimeRange: TimeRangeKey;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ value, children }: { value: DashboardContextValue; children: React.ReactNode }) {
  return <DashboardContext value={value}>{children}</DashboardContext>;
}

export function useDashboard() {
  const value = use(DashboardContext);
  if (!value) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return value;
}
