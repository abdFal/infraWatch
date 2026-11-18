"use client";

import { TIME_RANGES, type TimeRangeKey } from "@/lib/time-ranges";
import { cn } from "@/lib/utils";

/** Segmented control for the monitoring period. */
export function TimeRangeSelect({ value, onChange }: { value: TimeRangeKey; onChange: (value: TimeRangeKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Monitoring period" className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-xs">
      {TIME_RANGES.map((range) => {
        const active = range.key === value;
        return (
          <button
            key={range.key}
            type="button"
            role="radio"
            aria-checked={active}
            title={range.label}
            onClick={() => onChange(range.key)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {range.key}
          </button>
        );
      })}
    </div>
  );
}
