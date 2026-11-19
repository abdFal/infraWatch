import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border border-navy-200 dark:border-navy-800 bg-white dark:bg-navy-900 shadow-xs", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-navy-100 dark:border-navy-800 px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-navy-900 dark:text-navy-100">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-navy-500 dark:text-navy-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
