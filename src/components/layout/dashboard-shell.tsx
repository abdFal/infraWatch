"use client";

import { useState } from "react";
import { DashboardProvider, type DashboardContextValue } from "./dashboard-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({ value, children }: { value: DashboardContextValue; children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <DashboardProvider value={value}>
      <div className="min-h-screen bg-navy-50 dark:bg-navy-950">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <div className="lg:pl-64">
          <Topbar onMenuClick={() => setNavOpen(true)} />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </DashboardProvider>
  );
}
