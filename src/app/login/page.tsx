import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/auth";
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
      <div className="hidden w-[44%] flex-col justify-between bg-slate-950 p-10 text-slate-300 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-sky-500/15 ring-1 ring-sky-400/30">
            <Activity className="size-5 text-sky-400" />
          </span>
          <span className="font-semibold text-white">InfraWatch</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Infrastructure visibility, without the console tabs.</h1>
          <p className="mt-4 max-w-md text-slate-400">
            Monitor EC2 instance health and CloudWatch metrics from a single, read-only dashboard.
          </p>
        </div>
        <p className="text-xs text-slate-500">Read-only access · AWS credentials never leave the server</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-slate-900">
              <Activity className="size-5 text-sky-400" />
            </span>
            <span className="font-semibold">InfraWatch</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use the account created by the database seed script.</p>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
