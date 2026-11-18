import { AlertTriangle, LogIn, LogOut, Settings2, ShieldAlert, SlidersHorizontal, Wrench } from "lucide-react";
import type { ActivityLogEntry } from "@/lib/types";
import { cn, formatDateTime, formatRelativeTime } from "@/lib/utils";

export const ACTIVITY_META: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  LOGIN_SUCCESS: { label: "Sign in", icon: LogIn, className: "bg-emerald-50 text-emerald-700" },
  LOGIN_FAILED: { label: "Failed sign in", icon: ShieldAlert, className: "bg-rose-50 text-rose-700" },
  LOGOUT: { label: "Sign out", icon: LogOut, className: "bg-slate-100 text-slate-600" },
  SETTINGS_UPDATED: { label: "Settings", icon: Settings2, className: "bg-sky-50 text-sky-700" },
  PREFERENCES_UPDATED: { label: "Preferences", icon: SlidersHorizontal, className: "bg-sky-50 text-sky-700" },
  PROVIDER_ERROR: { label: "Provider error", icon: AlertTriangle, className: "bg-amber-50 text-amber-800" },
  SYSTEM: { label: "System", icon: Wrench, className: "bg-slate-100 text-slate-600" },
};

export function ActivityIcon({ action }: { action: string }) {
  const meta = ACTIVITY_META[action] ?? ACTIVITY_META.SYSTEM;
  const Icon = meta.icon;
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", meta.className)} title={meta.label}>
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

export function ActivityList({ items }: { items: ActivityLogEntry[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 px-5 py-3">
          <ActivityIcon action={item.action} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-800">{item.description}</p>
            <p className="mt-0.5 text-xs text-slate-500" title={formatDateTime(item.createdAt)}>
              {formatRelativeTime(item.createdAt)}
              {item.user ? ` · ${item.user.email}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
