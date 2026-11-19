"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions";
import { buttonClasses } from "@/components/ui/button";

const inputClass =
  "mt-1.5 block h-10 w-full rounded-lg border border-navy-300 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 text-sm text-navy-900 dark:text-navy-100 shadow-xs placeholder:text-navy-400 dark:placeholder:text-navy-500 focus:border-navy-500 dark:focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200 dark:focus:ring-navy-700";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-2.5 text-sm text-rose-800 dark:text-rose-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}
      <div>
        <label htmlFor="email" className="text-sm font-medium text-navy-700 dark:text-navy-300">
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
        <label htmlFor="password" className="text-sm font-medium text-navy-700 dark:text-navy-300">
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
