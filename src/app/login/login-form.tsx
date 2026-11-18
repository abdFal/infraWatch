"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions";
import { buttonClasses } from "@/components/ui/button";

const inputClass =
  "mt-1.5 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}
      <div>
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className={inputClass}
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", className: "h-10 w-full" })}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
