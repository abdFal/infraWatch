import { CheckCircle2, CircleDashed, CircleStop, Loader2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import type { InstanceState, OverallStatus, StatusCheck } from "@/lib/types";
import { cn } from "@/lib/utils";

const stateStyles: Record<InstanceState, { label: string; className: string; icon: React.ElementType; spin?: boolean }> = {
  running: { label: "Running", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: CheckCircle2 },
  stopped: { label: "Stopped", className: "bg-slate-100 text-slate-700 ring-slate-500/20", icon: CircleStop },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-800 ring-amber-600/25", icon: Loader2, spin: true },
  stopping: { label: "Stopping", className: "bg-amber-50 text-amber-800 ring-amber-600/25", icon: Loader2, spin: true },
  "shutting-down": { label: "Shutting down", className: "bg-amber-50 text-amber-800 ring-amber-600/25", icon: Loader2, spin: true },
  terminated: { label: "Terminated", className: "bg-rose-50 text-rose-700 ring-rose-600/20", icon: XCircle },
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
  ok: { label: "Passed", className: "text-emerald-700", icon: CheckCircle2 },
  impaired: { label: "Impaired", className: "text-rose-700", icon: AlertTriangle },
  initializing: { label: "Initializing", className: "text-amber-700", icon: CircleDashed },
  "insufficient-data": { label: "Insufficient data", className: "text-slate-500", icon: MinusCircle },
  "not-applicable": { label: "Not applicable", className: "text-slate-400", icon: MinusCircle },
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
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Degraded",
    description: "One or more instances are failing EC2 status checks.",
    className: "border-rose-200 bg-rose-50 text-rose-800",
    icon: AlertTriangle,
  },
  transitioning: {
    label: "Changes in progress",
    description: "Some instances are starting or stopping. Status checks are otherwise healthy.",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    icon: Loader2,
  },
  "no-instances": {
    label: "No instances",
    description: "No EC2 instances were found in the selected region.",
    className: "border-slate-200 bg-slate-50 text-slate-700",
    icon: MinusCircle,
  },
};
