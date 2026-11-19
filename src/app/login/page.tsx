import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme/theme";
import { db } from "@/lib/db";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;

  // Already signed in (and the account still exists)? Go straight to the dashboard.
  const session = await auth();
  if (session?.user?.id && (await db.user.count({ where: { id: session.user.id } })) > 0) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-[44%] flex-col justify-between bg-navy-950 p-10 text-navy-300 lg:flex dark:border-r dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-ocean-500/15 ring-1 ring-ocean-400/30">
            <Activity className="size-5 text-ocean-400" />
          </span>
          <span className="font-semibold text-cream">InfraWatch</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-cream">Infrastructure visibility, without the console tabs.</h1>
          <p className="mt-4 max-w-md text-navy-400">
            Monitor EC2 instance health and CloudWatch metrics from a single, read-only dashboard.
          </p>
        </div>
        <p className="text-xs text-navy-500">Read-only access · AWS credentials never leave the server</p>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-navy-900">
              <Activity className="size-5 text-ocean-400" />
            </span>
            <span className="font-semibold">InfraWatch</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-navy-100">Sign in</h2>
          <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">Use the account created by the database seed script.</p>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
