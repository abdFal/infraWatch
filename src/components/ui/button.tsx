import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-ocean-800 text-white hover:bg-ocean-700 focus-visible:outline-ocean-800 disabled:bg-navy-400 dark:bg-ocean-400 dark:text-navy-950 dark:hover:bg-ocean-300 dark:focus-visible:outline-ocean-400 dark:disabled:bg-navy-700 dark:disabled:text-navy-400",
  secondary:
    "border border-navy-300 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800/50 focus-visible:outline-navy-400 dark:focus-visible:outline-navy-500 disabled:text-navy-400 dark:disabled:text-navy-500",
  ghost: "text-navy-600 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-800 hover:text-navy-900 dark:hover:text-navy-100 focus-visible:outline-navy-400 dark:focus-visible:outline-navy-500",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
};

export function buttonClasses({ variant = "secondary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
