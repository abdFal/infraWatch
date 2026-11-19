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
      <div className="mb-3 rounded-full bg-navy-100 dark:bg-navy-800 p-3">
        <Icon className="size-5 text-navy-500 dark:text-navy-400" />
      </div>
      <p className="text-sm font-medium text-navy-900 dark:text-navy-100">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-navy-500 dark:text-navy-400">{description}</p> : null}
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
      <div className="mb-3 rounded-full bg-rose-50 dark:bg-rose-500/10 p-3">
        <AlertTriangle className="size-5 text-rose-600 dark:text-rose-400" />
      </div>
      <p className="text-sm font-medium text-navy-900 dark:text-navy-100">{title}</p>
      <p className="mt-1 max-w-md text-sm text-navy-500 dark:text-navy-400">{message}</p>
      {onRetry ? (
        <Button className="mt-4" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
