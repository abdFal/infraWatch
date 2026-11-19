"use client";

import { TIME_RANGES, type TimeRangeKey } from "@/lib/time-ranges";
import { cn } from "@/lib/utils";

/** Segmented control for the monitoring period. */
export function TimeRangeSelect({ value, onChange }: { value: TimeRangeKey; onChange: (value: TimeRangeKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Monitoring period" className="inline-flex rounded-lg border border-navy-300 dark:border-navy-700 bg-white dark:bg-navy-900 p-0.5 shadow-xs">
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
              active ? "bg-ocean-800 text-white dark:bg-ocean-400 dark:text-navy-950" : "text-navy-600 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-800",
            )}
          >
            {range.key}
          </button>
        );
      })}
    </div>
  );
}
