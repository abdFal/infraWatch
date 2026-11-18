"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, LineChart, ScrollText, Server, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/instances", label: "EC2 Instances", icon: Server },
  { href: "/monitoring", label: "Monitoring", icon: LineChart },
  { href: "/activity", label: "Activity Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn("fixed inset-0 z-30 bg-slate-950/50 lg:hidden", open ? "block" : "hidden")}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-white/10 px-5">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-sky-500/15 ring-1 ring-sky-400/30">
              <Activity className="size-4 text-sky-400" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">InfraWatch</span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                )}
              >
                <Icon className={cn("size-4", active ? "text-sky-400" : "text-slate-500")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-500">
          Read-only monitoring
          <br />
          Amazon EC2 · CloudWatch
        </div>
      </aside>
    </>
  );
}
