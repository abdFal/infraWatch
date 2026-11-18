import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-slate-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className={buttonClasses({ variant: "primary", className: "mt-6" })}>
        Back to dashboard
      </Link>
    </div>
  );
}
