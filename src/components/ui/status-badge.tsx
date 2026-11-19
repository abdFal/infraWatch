import { CheckCircle2, CircleDashed, CircleStop, Loader2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import type { InstanceState, OverallStatus, StatusCheck } from "@/lib/types";
import { cn } from "@/lib/utils";

const stateStyles: Record<InstanceState, { label: string; className: string; icon: React.ElementType; spin?: boolean }> = {
  running: { label: "Running", className: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20 dark:ring-emerald-400/30", icon: CheckCircle2 },
  stopped: { label: "Stopped", className: "bg-navy-100 dark:bg-navy-800 text-navy-700 dark:text-navy-300 ring-navy-500/20 dark:ring-navy-400/25", icon: CircleStop },
  pending: { label: "Pending", className: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-600/25 dark:ring-amber-400/30", icon: Loader2, spin: true },
  stopping: { label: "Stopping", className: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-600/25 dark:ring-amber-400/30", icon: Loader2, spin: true },
  "shutting-down": { label: "Shutting down", className: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-600/25 dark:ring-amber-400/30", icon: Loader2, spin: true },
  terminated: { label: "Terminated", className: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-600/20 dark:ring-rose-400/30", icon: XCircle },
};

export function InstanceStateBadge({ state, className }: { state: InstanceState; className?: string }) {
  const style = stateStyles[state];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        style.className,
        className,
      )}
    >
      <Icon className={cn("size-3.5", style.spin && "animate-spin [animation-duration:2s]")} aria-hidden />
      {style.label}
    </span>
  );
}

const checkStyles: Record<StatusCheck, { label: string; className: string; icon: React.ElementType }> = {
  ok: { label: "Passed", className: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  impaired: { label: "Impaired", className: "text-rose-700 dark:text-rose-300", icon: AlertTriangle },
  initializing: { label: "Initializing", className: "text-amber-700 dark:text-amber-300", icon: CircleDashed },
  "insufficient-data": { label: "Insufficient data", className: "text-navy-500 dark:text-navy-400", icon: MinusCircle },
  "not-applicable": { label: "Not applicable", className: "text-navy-400 dark:text-navy-500", icon: MinusCircle },
};

export function StatusCheckBadge({ status }: { status: StatusCheck }) {
  const style = checkStyles[status];
  const Icon = style.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", style.className)}>
      <Icon className="size-3.5" aria-hidden />
      {style.label}
    </span>
  );
}

export const overallStatusStyles: Record<
  OverallStatus,
  { label: string; description: string; className: string; icon: React.ElementType }
> = {
  operational: {
    label: "All systems operational",
    description: "Every running instance is passing its EC2 status checks.",
    className: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Degraded",
    description: "One or more instances are failing EC2 status checks.",
    className: "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300",
    icon: AlertTriangle,
  },
  transitioning: {
    label: "Changes in progress",
    description: "Some instances are starting or stopping. Status checks are otherwise healthy.",
    className: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200",
    icon: Loader2,
  },
  "no-instances": {
    label: "No instances",
    description: "No EC2 instances were found in the selected region.",
    className: "border-navy-200 dark:border-navy-800 bg-navy-50 dark:bg-navy-800/50 text-navy-700 dark:text-navy-300",
    icon: MinusCircle,
  },
};
