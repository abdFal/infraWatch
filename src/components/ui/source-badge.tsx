import { AlertTriangle, Cloud, FlaskConical } from "lucide-react";
import type { DataSource, SourceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const sourceStyles: Record<DataSource, { label: string; title: string; className: string; icon: React.ElementType }> = {
  AWS: {
    label: "AWS",
    title: "Real instance from your AWS account",
    className: "bg-sky-50 text-sky-800 ring-sky-600/25",
    icon: Cloud,
  },
  MOCK: {
    label: "Mock",
    title: "Generated demo data, not a real instance",
    className: "bg-violet-50 text-violet-700 ring-violet-600/20",
    icon: FlaskConical,
  },
};

/** Labels where an instance's data comes from. Icon + text, never colour alone. */
export function SourceBadge({ source, className }: { source: DataSource; className?: string }) {
  const style = sourceStyles[source];
  const Icon = style.icon;
  return (
    <span
      title={style.title}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        style.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {style.label}
    </span>
  );
}

/**
 * Shown above lists when a source failed but others succeeded, so missing AWS
 * data is never mistaken for "no instances". Renders nothing when all is well.
 */
export function SourceStatusNotice({ sources, className }: { sources: SourceStatus[] | undefined; className?: string }) {
  const failed = sources?.filter((s) => !s.ok) ?? [];
  if (failed.length === 0) return null;
  const working = sources!.filter((s) => s.ok).map((s) => sourceStyles[s.source].label);

  return (
    <div className={cn("space-y-2", className)}>
      {failed.map((s) => (
        <div key={s.source} role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">
              {sourceStyles[s.source].label} data unavailable
              {working.length > 0 ? <span className="font-normal"> · showing {working.join(" + ")} instances only</span> : null}
            </p>
            <p className="mt-0.5 text-rose-800">{s.error?.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
