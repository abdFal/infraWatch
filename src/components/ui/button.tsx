import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900 disabled:bg-slate-400",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400 disabled:text-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-400",
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
