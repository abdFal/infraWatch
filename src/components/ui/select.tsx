import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Styled native <select>: accessible and keyboard-friendly by default. */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-9 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-9 text-sm text-slate-800 shadow-xs focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
