"use client";

import { Cloud, FlaskConical, Globe, Layers, LogOut, Menu } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { ThemeToggle } from "@/components/theme/theme";
import { regionName } from "@/lib/aws/regions";
import { useDashboard } from "./dashboard-context";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, region, providerMode } = useDashboard();
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-navy-200 dark:border-navy-800 bg-white/90 dark:bg-navy-900/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        className="rounded-md p-2 text-navy-500 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-800 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-navy-200 dark:border-navy-800 bg-navy-50 dark:bg-navy-800/50 px-2.5 py-1 text-xs text-navy-600 dark:text-navy-400"
          title={regionName(region)}
        >
          <Globe className="size-3.5 shrink-0 text-navy-400 dark:text-navy-500" />
          <span className="font-medium text-navy-800 dark:text-navy-200">{region}</span>
          <span className="hidden truncate md:inline">· {regionName(region)}</span>
        </span>
        {providerMode === "MOCK" ? (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-300 sm:px-2.5"
            title="MONITORING_PROVIDER=MOCK — all instances and metrics are generated demo data, not your AWS account."
          >
            <FlaskConical className="size-3.5" />
            Mock<span className="hidden sm:inline"> data</span>
          </span>
        ) : providerMode === "HYBRID" ? (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-ocean-200 dark:border-ocean-500/30 bg-ocean-50 dark:bg-ocean-500/10 px-2 py-1 text-xs font-medium text-ocean-800 dark:text-ocean-300 sm:px-2.5"
            title="MONITORING_PROVIDER=HYBRID — real AWS instances and generated mock instances are shown together. Each instance has an AWS or MOCK badge."
          >
            <Layers className="size-3.5" />
            AWS + Mock
          </span>
        ) : (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 sm:px-2.5"
            title="MONITORING_PROVIDER=AWS — only real data from your AWS account."
          >
            <Cloud className="size-3.5" />
            Live AWS
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight text-navy-900 dark:text-navy-100">{user.name}</p>
          <p className="text-xs leading-tight text-navy-500 dark:text-navy-400">{user.role === "ADMIN" ? "Administrator" : "Viewer"}</p>
        </div>
        <span className="hidden size-9 items-center justify-center rounded-full bg-ocean-800 text-xs font-semibold text-white dark:bg-ocean-700 sm:flex" aria-hidden>
          {initials || "U"}
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-navy-600 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-800 hover:text-navy-900 dark:hover:text-navy-100"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
