import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  itemLabel = "items",
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
      <span>
        Showing <span className="font-medium text-slate-700">{from}</span>–
        <span className="font-medium text-slate-700">{to}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span> {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="size-4" /> Prev
        </Button>
        <span className="tabular-nums">
          Page {page} of {totalPages}
        </span>
        <Button size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
