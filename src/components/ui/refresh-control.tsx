"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function RefreshControl({
  lastUpdated,
  isRefreshing,
  onRefresh,
  refreshIntervalSec,
}: {
  lastUpdated?: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
  refreshIntervalSec?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500" aria-live="polite">
        {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-US", { hour12: false })}` : "Loading…"}
        {refreshIntervalSec ? ` · auto every ${refreshIntervalSec >= 60 ? `${refreshIntervalSec / 60}m` : `${refreshIntervalSec}s`}` : " · auto-refresh off"}
      </span>
      <Button size="sm" onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh now">
        <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}
