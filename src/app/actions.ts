"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { auth, signIn, signOut } from "@/auth";
import { clientIpFrom, logActivity } from "@/lib/activity";
import { loginSchema } from "@/lib/validation/schemas";

export interface LoginState {
  error?: string;
  email?: string;
}

/**
 * Only allow redirects to paths on this site (prevents open-redirect attacks).
 * Absolute URLs (the proxy sends e.g. "http://localhost:3000/instances") are
 * reduced to their path, so the host part is always ignored.
 */
function safeCallbackUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length > 2048) return "/";
  try {
    const parsed = new URL(value, "http://placeholder.invalid");
    const path = `${parsed.pathname}${parsed.search}`;
    if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/login")) return "/";
    return path;
  } catch {
    return "/";
  }
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")) : "";
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", email };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
    return {};
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return { error: "Too many failed attempts. Please wait 15 minutes and try again.", email };
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email or password.", email };
    }
    throw error; // includes Next.js's redirect on success
  }
}

export async function logoutAction() {
  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      action: "LOGOUT",
      description: `${session.user.name ?? "User"} signed out`,
      userId: session.user.id,
      ipAddress: clientIpFrom(await headers()),
    });
  }
  await signOut({ redirectTo: "/login" });
}
