import { AlertTriangle, Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-3 rounded-full bg-slate-100 p-3">
        <Icon className="size-5 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load data",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}
    >
      <div className="mb-3 rounded-full bg-rose-50 p-3">
        <AlertTriangle className="size-5 text-rose-600" />
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
      {onRetry ? (
        <Button className="mt-4" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
