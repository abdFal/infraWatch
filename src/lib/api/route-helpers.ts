import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProviderError } from "@/lib/providers";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VIEWER";
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Verifies the session AND that the user still exists in the database
 * (a deleted user's token stops working immediately).
 */
export async function requireApiUser(): Promise<ApiUser> {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
  return user;
}

/**
 * Wraps a route handler with authentication and consistent, safe error responses.
 * Internal error details are logged on the server and never sent to the client.
 */
export function withApi<Ctx>(
  handler: (request: Request, ctx: Ctx & { user: ApiUser }) => Promise<Response>,
) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    try {
      const user = await requireApiUser();
      return await handler(request, { ...ctx, user });
    } catch (error) {
      if (error instanceof ApiError) return jsonError(error.status, error.code, error.message);
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message ?? "Invalid request.";
        return jsonError(400, "VALIDATION_ERROR", message);
      }
      if (error instanceof ProviderError) {
        return jsonError(error.httpStatus, `PROVIDER_${error.code}`, error.message);
      }
      console.error("[api] unexpected error", error);
      return jsonError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
    }
  };
}

export function searchParamsObject(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}
