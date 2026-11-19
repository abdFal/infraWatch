import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Styled native <select>: accessible and keyboard-friendly by default. */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-9 w-full appearance-none rounded-lg border border-navy-300 dark:border-navy-700 bg-white dark:bg-navy-900 pl-3 pr-9 text-sm text-navy-800 dark:text-navy-200 shadow-xs focus:border-navy-500 dark:focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200 dark:focus:ring-navy-700 disabled:bg-navy-50 dark:disabled:bg-navy-800/50 disabled:text-navy-500 dark:disabled:text-navy-400"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-navy-400 dark:text-navy-500" />
    </div>
  );
}
